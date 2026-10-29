# Sorgenti della wiki

Le pagine della wiki di GitHub vivono in un repository separato (`smart-kitchen.wiki.git`). Qui teniamo i sorgenti, così sono versionati e rivedibili nelle PR: **non modificare la wiki dal sito**, le modifiche verrebbero sovrascritte.

## Pubblicazione

Al merge su `master` di una modifica a `docs/wiki/`, il workflow [`wiki.yml`](../../.github/workflows/wiki.yml) copia le pagine nella wiki, eliminando quelle che non esistono più qui (questo `README.md` non viene pubblicato). Si può rilanciare a mano da GitHub › **Actions** › **Wiki** › **Run workflow**.

Setup una tantum: la wiki va prima inizializzata dalla scheda **Wiki** del repo, creando una prima pagina (altrimenti il workflow fallisce con un messaggio che lo ricorda). Poi il workflow usa il `GITHUB_TOKEN` del repo, nessun segreto da configurare.

## Pubblicazione manuale (ripiego)

```bash
git clone https://github.com/colombodevdesign/smart-kitchen.wiki.git
rsync -a --delete --exclude .git --exclude README.md docs/wiki/ smart-kitchen.wiki/
cd smart-kitchen.wiki && git add -A && git commit -m "Aggiorna wiki" && git push
```

I link `[[Nome pagina]]` puntano al file con lo stesso nome.
