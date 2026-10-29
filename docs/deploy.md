# Deploy

| Cosa | Come | Quando |
|---|---|---|
| Client (PWA) | Vercel | a ogni push; `master` è la produzione, gli altri branch sono anteprime in modalità demo |
| Regole Firestore (`firestore.rules`) | workflow GitHub [`firebase.yml`](../.github/workflows/firebase.yml) | al merge su `master` se cambiano, **prima** delle Functions |
| Cloud Functions (`functions/`) | stesso workflow | al merge su `master` se cambiano |
| Wiki (`docs/wiki/`) | workflow [`wiki.yml`](../.github/workflows/wiki.yml) | al merge su `master` se cambiano le pagine; setup in [`docs/wiki/README.md`](wiki/README.md) |

Sulle PR che toccano `functions/`, `firestore.rules` o `firebase.json` il workflow fa solo i controlli, senza credenziali:
- i test delle Functions;
- la compilazione delle regole nell'emulatore Firestore (`scripts/check-firestore-rules.mjs`).

Avvio manuale: GitHub › **Actions** › **Firebase** › **Run workflow** (da `master`), scegliendo `tutto`, `regole` o `functions`.

Il workflow si autentica su Google Cloud con **Workload Identity Federation**: GitHub riceve un token temporaneo a ogni esecuzione e nel repo non c'è nessuna chiave. Il token vale solo per questo repo e per il branch `master`.

## Setup una tantum

Serve [`gcloud`](https://cloud.google.com/sdk/docs/install) con un account proprietario del progetto Firebase (oppure Cloud Shell dalla Console). Va fatto **prima** del primo merge che tocca Functions o regole; altrimenti quel deploy fallisce, senza danni, e lo si rilancia a mano dopo il setup.

```bash
PROJECT_ID=smart-kitchen-822db
REPO=colombodevdesign/smart-kitchen
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
SA="github-deploy@${PROJECT_ID}.iam.gserviceaccount.com"

# API usate dal setup (di solito sono già attive in un progetto con le Functions)
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  cloudresourcemanager.googleapis.com --project "$PROJECT_ID"

# 1. Service account con cui il workflow pubblica
gcloud iam service-accounts create github-deploy --project "$PROJECT_ID" \
  --display-name "GitHub Actions: deploy Firebase"

for ROLE in \
  roles/cloudfunctions.admin \
  roles/run.admin \
  roles/cloudscheduler.admin \
  roles/artifactregistry.admin \
  roles/iam.serviceAccountUser \
  roles/firebaserules.admin \
  roles/serviceusage.serviceUsageConsumer \
  roles/firebaseextensions.viewer
do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$SA" --role "$ROLE" --condition=None
done

# 2. Pool e provider: accettano solo i token di questo repo, dal branch master
gcloud iam workload-identity-pools create github --project "$PROJECT_ID" --location global \
  --display-name "GitHub Actions"

gcloud iam workload-identity-pools providers create-oidc smart-kitchen --project "$PROJECT_ID" \
  --location global --workload-identity-pool github \
  --display-name "smart-kitchen" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition "assertion.repository == '$REPO' && assertion.ref == 'refs/heads/master'"

# 3. Il repo può agire come il service account
gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"

# Valori per le variabili del repo
echo "GCP_WORKLOAD_IDENTITY_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/smart-kitchen"
echo "GCP_SERVICE_ACCOUNT=$SA"
```

4. Su GitHub, in **Settings › Secrets and variables › Actions › Variables**, crea le due variabili stampate alla fine:
   - `GCP_WORKLOAD_IDENTITY_PROVIDER`;
   - `GCP_SERVICE_ACCOUNT`.
   
   Sono **variabili**, non segreti: non contengono credenziali.
5. **Prova:**
   - Actions › Firebase › Run workflow con `target: regole`, poi con `functions`;
   - se manca un permesso, l'errore di Firebase nomina il ruolo o l'API: aggiungilo con `gcloud projects add-iam-policy-binding` e rilancia;
   - il riepilogo del job dice cosa è stato pubblicato.

## Deploy manuale (ripiego)

```bash
firebase deploy --only firestore:rules      # regole
cd functions && npm ci && cd .. && firebase deploy --only functions   # functions (prima esegue i test)
```

`firebase.json` fa girare i test delle Functions prima di ogni deploy (`predeploy`): con un test rosso il deploy non parte.
