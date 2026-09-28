# Pépins & Trognons — mockup

Mockup statique (démarchage à froid, pas un projet client confirmé) pour **Pépins & Trognons**,
boutique éco-responsable réelle au 111 Boulevard Auguste Blanqui, 75013 Paris.

Aucune dépendance, aucun backend : HTML/CSS/JS pur. Tout l'état (catalogue, panier, réservations,
stock) vit en mémoire et dans `localStorage`, pour une démo autonome et rejouable.

## Lancer le site

Ouvrir `index.html` directement dans un navigateur, ou servir le dossier avec un petit serveur
statique (recommandé pour éviter les soucis de CORS sur certains navigateurs) :

```bash
python3 -m http.server 8000
```

puis ouvrir `http://localhost:8000`.

## Structure

```
index.html          Page unique (SPA côté client)
css/styles.css       Styles globaux + variables de couleur
js/data.js           Données de démo : produits, univers, réservations, historique
js/app.js            État, logique, rendu de tous les écrans
logo.jpg             Logo réel de la boutique
photos/               Photos réelles (produits, boutique, histoire)
RESEARCH.md          Recherche UX/UI qui a précédé le design
```

## Écrans

- **Site client** : Accueil, Catalogue (4 univers), Fiche produit, Panier de retrait
  (réservation avec jour/créneau + emballage cadeau), Confirmation avec code de réservation.
- **Espace équipe** (bouton en bas à droite, ou pied de page) : Stock (KPIs, seuils bas,
  ajout/édition de produit, ajustement +1/−1), Réservations (À préparer / Prête / Retirée /
  Expirée), Historique (qui a changé quoi, et quand).

Basculer entre "Simon" et "Christopher" dans l'espace équipe change simplement la signature
laissée dans l'historique — utile pour montrer la traçabilité pendant une démo.

## Réinitialiser la démo

Bouton "Réinitialiser la démo" dans l'espace équipe, ou effacer la clé `pt-demo-v1` du
`localStorage` du navigateur.

## Origine

Ce site a été porté depuis un prototype de design (`Formulaire projet logo photos/`, non
commité — voir `.gitignore`) vers du HTML/CSS/JS simple, sans dépendance ni runtime
propriétaire, pour être commit-able tel quel.
