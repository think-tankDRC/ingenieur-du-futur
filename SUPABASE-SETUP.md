# Mise en service de Supabase

## 1. Créer la base

1. Créez un projet sur https://supabase.com.
2. Dans **SQL Editor**, ouvrez puis exécutez tout le contenu de `supabase-setup.sql`.

## 2. Connecter le site

Dans **Project Settings > API**, copiez :

- l’URL du projet ;
- la clé publique **Publishable** (ou la clé `anon` des anciens projets).

Placez ces deux valeurs dans `supabase-config.js`. Ne placez jamais la clé
`service_role`, une secret key ou votre mot de passe dans les fichiers GitHub.

## 3. Tester

1. Envoyez une inscription depuis `index.html`.
2. Ouvrez directement `dashboard.html`.
3. Vérifiez que le candidat apparaît et testez un changement de statut.

Le site peut ensuite être publié sur GitHub Pages. Les données resteront dans
Supabase et seront partagées entre tous les appareils.

> Attention : le dashboard ne possède pas d’authentification. Toute personne
> qui connaît son adresse peut consulter, modifier ou supprimer les inscriptions.

## 4. Confirmer une inscription par WhatsApp

Aucune API WhatsApp et aucun secret Meta ne sont nécessaires.

1. Ouvrez `dashboard.html`.
2. Repérez le candidat dans la liste.
3. Cliquez sur **Confirmer**.
4. Son statut passe à **Validé** dans Supabase.
5. WhatsApp s’ouvre sur son numéro avec le message de confirmation prérempli.
6. Vérifiez le message puis appuyez sur **Envoyer** dans WhatsApp.

Après validation, le bouton devient **WhatsApp** afin de pouvoir rouvrir la
conversation si nécessaire. Le navigateur doit autoriser l’ouverture du nouvel
onglet WhatsApp.

L’ancienne fonction Edge `send-confirmation` n’est plus appelée par le site et
peut rester désactivée ou être supprimée du projet Supabase.
