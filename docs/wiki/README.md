# Sorgenti della wiki

Le pagine della wiki di GitHub vivono in un repository separato (`smart-kitchen.wiki.git`). Qui teniamo i sorgenti, così sono versionati e rivedibili nelle PR.

Per pubblicarli:

```bash
git clone https://github.com/colombodevdesign/smart-kitchen.wiki.git
cp docs/wiki/*.md smart-kitchen.wiki/ && rm smart-kitchen.wiki/README.md
cd smart-kitchen.wiki && git add -A && git commit -m "Aggiorna wiki" && git push
```

(La wiki va prima inizializzata dalla scheda Wiki del repo, creando una prima pagina.) I link `[[Nome pagina]]` puntano al file con lo stesso nome.
