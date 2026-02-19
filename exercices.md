# TP FACTOR10 – Simulation d’une ligne de production

---

# Partie 1 — Prise en main

## Exercice 1 — Premier flux minimal

### Objectif

Créer une chaîne minimale :
Source → Sink

### Travail demandé

1. Créer un `Product` nommé **Box**
2. Lui attribuer :
   * un prix
   * un asset
3. Créer une `Source`
4. Créer un `Sink` de livraison (capacity = 0)
5. Relier avec un `Link`

### Questions

* Que se passe-t-il si `capacity = 10` ?
* Que signifie `capacity = 0` ?

---

## Exercice 2 — Paramétrer le temps

### Objectif

Comprendre le rôle des ticks.

Modifier :

* `setDuration(2)`
* puis `setDuration(10)`

Observer :

* le débit
* la courbe de production

---

# Partie 2 — Buffers et pertes

## Exercice 3 — Création d’un buffer

Créer :

Source → Buffer (capacity 5) → Product process → Delivery

Observer :

* saturation
* perte (loss)

Questions :

* À partir de quelle capacité n’y a-t-il plus de perte ?
* Comment évolue le profit ?

---

## Exercice 4 — Goulot d’étranglement

Créer deux machines en série :

Source A (duration 2) → Stock → Source B (duration 6) → Delivery

Identifier :

* le goulot
* l’impact sur le débit global

Modifier les durées et comparer.

---

# Partie 3 — Recettes et assemblage

## Exercice 5 — Machine avec recette

Créer :

* Product A (Raw)
* Product B (Finished)
* Une source de Raw
* Un stock de Raw
* Une machine qui consomme 2 Raw pour produire 1 Finished

Configurer :

* `setVolume(2)` sur le lien entrant

Questions :

* Que se passe-t-il si le stock Raw est vide ?
* Que se passe-t-il si on change le volume à 3 ?

---

## Exercice 6 — Multi-input

Créer une machine qui nécessite :

* 2 Raw A
* 1 Raw B

Observer :

* comportement si un seul input manque
* effet sur la cadence

---

# Partie 4 — Défauts et pannes

## Exercice 7 — Produits défectueux

Ajouter :

* `setFailFrequence(0.1)`

Observer :

* évolution du fail
* impact sur profit

Question :

* À partir de quel taux le système devient non rentable ?

---

## Exercice 8 — Pannes machines

Ajouter :

* `setBreakFrequence(0.05)`
* `setBreakDuration(20)`

Analyser :

* temps d’arrêt
* impact sur débit
* variation des pertes

---

# Partie 5 — Optimisation

## Exercice 9 — Doublement du poste critique

Dupliquer la machine goulot.

Comparer :

* débit
* profit
* taux de perte

---

## Exercice 10 — Optimisation économique

Objectif :
Maximiser le profit sur 200 ticks.

Variables modifiables :

* capacité buffers
* durée machines
* taux de défaut
* volume recette

Présenter :

* configuration choisie
* justification
* résultats chiffrés

---

# Partie 6 — Mini projet final

## Cas industriel libre

Contraintes :

* minimum 3 machines
* au moins 1 buffer
* au moins 1 recette multi-input
* prise en compte des pannes

Livrable :

* fichier de sauvegarde du projet
* analyse du débit en excel
* analyse du profit en excel
* identification des goulots dans excel
