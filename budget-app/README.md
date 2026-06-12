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

## Environnements

Deux stacks Docker totalement isolées (projets, volumes et ports distincts) :

| | Prod (`docker-compose.yml`) | Dev (`docker-compose.dev.yml`) |
|---|---|---|
| Application web | http://localhost:4200 | http://localhost:4201 |
| API | http://localhost:5000/api | http://localhost:5001/api |
| SQL Server | `localhost,1433` | `localhost,1434` |
| Volume de données | `budget-db-data` | `budget-db-data-dev` |
| Démarrage | `docker compose up --build -d` | `docker compose -f docker-compose.dev.yml up --build -d` |

La **prod** porte vos données réelles ; la **dev** démarre vide (schéma + données de
départ) et sert à tester sans risque — on peut y restaurer une copie de la prod
(voir Sauvegardes ci-dessous).

Les données sont persistées dans les volumes Docker : elles survivent aux
redémarrages (`docker compose down` ne les supprime pas, `docker compose down -v` oui).

## Sauvegardes de la base de prod

- **Automatique** : le conteneur `budget-db-backup` sauvegarde `BudgetDb` chaque jour
  dans le dossier `./backups` (fichiers `BudgetDb_auto_*.bak`, rétention 14 jours —
  seuls les backups automatiques sont purgés, jamais les manuels).
- **Manuelle** (avant une opération risquée) :
  ```powershell
  .\scripts\backup.ps1                  # → backups\BudgetDb_manuel_<horodatage>.bak
  ```
- **Restauration** (remplace toutes les données de la base ciblée) :
  ```powershell
  .\scripts\restore.ps1 -File BudgetDb_auto_20260612_030000.bak           # prod (confirmation demandée)
  .\scripts\restore.ps1 -File BudgetDb_manuel_20260612_180000.bak -Env dev  # copie de la prod vers la dev
  ```
  Le script arrête l'API le temps de la restauration puis la redémarre.

Pensez à copier de temps en temps le dossier `backups/` sur un autre support
(disque externe, cloud) : un backup sur la même machine ne protège pas d'une panne disque.

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
├── docker-compose.yml          # PROD : db (SQL Server) + db-backup + api (.NET) + web (nginx)
├── docker-compose.dev.yml      # DEV : mêmes services, ports/volume séparés
├── scripts/                    # backup.ps1, restore.ps1
├── backups/                    # .bak quotidiens + manuels (hors git)
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
- **Mot de passe SQL Server** : `Budget@pp2026!`, défini à plusieurs endroits qui
  doivent rester synchronisés : `docker-compose.yml` (services `db`, `db-backup` et `api`),
  `docker-compose.dev.yml` (services `db` et `api`) et `scripts/backup.ps1` / `scripts/restore.ps1`.
- Le schéma de base est géré par les **migrations EF Core** (`backend/Migrations/`),
  appliquées automatiquement au démarrage : les mises à jour de schéma se font donc
  **sans perte de données**. Les bases créées par d'anciennes versions (avant les
  migrations) sont détectées et mises à niveau automatiquement. Données de départ :
  7 catégories françaises avec mots-clés, un compte « Compte courant » et 6 repas.
