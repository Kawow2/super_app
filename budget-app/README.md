# Mon Budget

Application web de gestion de budget personnel, entièrement hébergée en local via Docker.

- **Front** : Angular 19 (composants standalone, signals partout), Chart.js, servi par nginx
- **Back** : ASP.NET Core 8 (Web API + Entity Framework Core)
- **Base** : SQL Server 2022 (conteneur officiel Microsoft)

## Démarrage rapide

Prérequis : [Docker Desktop](https://www.docker.com/products/docker-desktop/) (ou Docker + Compose).

```bash
docker compose up --build -d
```

Le premier démarrage prend quelques minutes (téléchargement de l'image SQL Server,
build .NET et Angular). L'API patiente automatiquement le temps que SQL Server soit prêt.

| Service | URL |
|---|---|
| Application web | http://localhost:4200 |
| API | http://localhost:5000/api |

Les données sont persistées dans le volume Docker `budget-db-data` :
elles survivent aux redémarrages (`docker compose down` ne les supprime pas,
`docker compose down -v` oui).

## Fonctionnalités

- **Tableau de bord** : solde par compte et solde total, dépenses/revenus mois par mois,
  répartition des dépenses par catégorie (anneau), comparaison année par année. Filtrable
  par compte et par année.
- **Transactions** : liste filtrable (compte, mois, recherche), changement de catégorie
  en ligne, ajout manuel, suppression.
- **Import de relevés** : `.csv`, `.xlsx` et `.pdf`, avec choix du compte de destination,
  **aperçu avant import** et **détection des doublons** (jamais réimportés).
- **Catégories** : nom, couleur et mots-clés pour la **catégorisation automatique** à
  l'import (ex. `netflix; spotify` → catégorie Abonnements).
- **Abonnements récurrents** : calendrier mensuel montrant chaque prélèvement à son jour,
  total mensuel, activation/désactivation. **Détection automatique** : l'application repère
  dans vos transactions les dépenses revenant au moins 3 mois consécutifs, à montant stable
  (±10 %) et à date régulière (±3 jours), et vous propose de les ajouter en un clic.
- **Catégorisation par similarité** : changer la catégorie d'une transaction la propage
  automatiquement à toutes les transactions au libellé similaire (les chiffres — dates,
  numéros de facture — sont ignorés dans la comparaison). Un filtre « Non catégorisé »
  permet de retrouver les transactions restantes à classer.
- **Filtres de transactions** : compte, catégorie, période (date min / max),
  montant min / max (en valeur absolue) et recherche par libellé.
- **Thème** : une couleur d'accent unique, modifiable dans Paramètres (pré-réglages +
  sélecteur libre), appliquée à toute l'interface et aux graphiques.
- **Export / restauration** : un fichier JSON contient tout (comptes, transactions,
  catégories, abonnements, paramètres) pour changer de PC en gardant l'historique.

## Import : formats reconnus

Le parseur détecte les colonnes par leurs en-têtes, peu importe l'ordre :

- **Date** : `Date`, `Date opération`, `Date comptable`, `Date valeur`…
  Formats `jj/mm/aaaa`, `jj.mm.aaaa`, `aaaa-mm-jj`…
- **Libellé** : `Libellé`, `Description`, `Intitulé`, `Opération`…
- **Montant** : soit une colonne `Montant` signée (négatif = dépense), soit deux colonnes
  `Débit` / `Crédit`. Les formats `1 234,56`, `1,234.56`, `(123,45)`, avec ou sans `€`,
  sont gérés.

Particularités :

- **CSV** : séparateur (`;`, `,`, tabulation) et encodage (UTF-8 ou Windows-1252)
  détectés automatiquement ; les lignes d'en-tête parasites avant le tableau sont ignorées.
  Deux fichiers d'essai sont fournis : `exemples/transactions-exemple.csv` (format générique)
  et `exemples/banque-populaire-exemple.csv` (format d'export Banque Populaire / Cyberplus,
  avec colonnes Débit / Crédit et libellé simplifié, géré nativement).
- **XLSX** : première feuille, en-têtes sur la première ligne.
- **XLS** (ancien format) : non supporté → réenregistrer en `.xlsx` depuis Excel.
- **PDF** : lecture *best effort* (extraction de texte + reconnaissance date/libellé/montant
  ligne par ligne). Les PDF de relevés étant très variables d'une banque à l'autre,
  **envoyez-moi votre template quand vous l'aurez** : le parseur
  (`backend/Services/ImportParser.cs`, méthode `ParsePdf`) pourra être adapté précisément.

### Détection des doublons

Chaque transaction reçoit une empreinte SHA-256 calculée sur :
`compte + date + montant + libellé normalisé` (minuscules, accents et espaces superflus
supprimés). À l'import, toute ligne dont l'empreinte existe déjà — en base **ou** plus haut
dans le même fichier — est marquée *Doublon* et ignorée. Vous pouvez donc réimporter sans
risque un relevé qui chevauche le précédent.

## Sauvegarde / changement de PC

1. Paramètres → **Exporter toutes les données** → un fichier
   `budget-export-aaaa-mm-jj.json` est téléchargé.
2. Sur le nouveau PC : lancer l'application, Paramètres → **Restauration** → choisir le
   fichier. ⚠️ La restauration **remplace** toutes les données présentes. Les identifiants
   étant conservés, l'historique est restitué à l'identique.

## Développement sans Docker (optionnel)

- **API** : SQL Server accessible (le conteneur `db` seul suffit :
  `docker compose up -d db`), puis `cd backend && dotnet run` → http://localhost:5000 selon
  votre `launchSettings`, ou utilisez la chaîne de connexion de `appsettings.json`.
- **Front** : `cd frontend && npm install && npm start` → http://localhost:4200, le proxy
  (`proxy.conf.json`) redirige `/api` vers `http://localhost:5000`.

## Structure du projet

```
budget-app/
├── docker-compose.yml          # db (SQL Server) + api (.NET) + web (nginx)
├── backend/                    # API ASP.NET Core 8
│   ├── Controllers/            # Accounts, Transactions, Categories, Subscriptions,
│   │                           # Analytics, Import, Export, Settings
│   ├── Services/               # ImportParser (csv/xlsx/pdf), Util (hash, normalisation)
│   ├── Models/  Data/          # Entités, DbContext, seed (catégories par défaut)
├── frontend/                   # Angular 19 + signals
│   └── src/app/
│       ├── core/               # modèles + services (signals & HttpClient)
│       ├── shared/             # composant Chart.js réactif
│       └── features/           # dashboard, transactions, import, catégories,
│                               # abonnements, comptes, paramètres
└── exemples/transactions-exemple.csv
```

## Limites connues et notes

- **PDF** : heuristique générique en attendant votre template de relevé.
- **Pas d'authentification** (choix assumé : usage local).
- **Mot de passe SQL Server** : défini dans `docker-compose.yml`
  (`Budget@pp2026!`). Si vous le changez, changez-le aux deux endroits
  (variable `MSSQL_SA_PASSWORD` du service `db` **et** chaîne de connexion du service `api`).
- Le schéma de base est géré par les **migrations EF Core** (`backend/Migrations/`),
  appliquées automatiquement au démarrage : les mises à jour de schéma se font donc
  **sans perte de données**. Les bases créées par d'anciennes versions (avant les
  migrations) sont détectées et mises à niveau automatiquement. Données de départ :
  7 catégories françaises avec mots-clés, un compte « Compte courant » et 6 repas.
