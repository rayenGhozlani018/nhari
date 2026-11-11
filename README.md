# Nhari نهاري

Application personnelle d'organisation de la journée (travail, finances, santé, études, dine), en arabe tunisien et en français.

- Installable sur Android : ouvrir le site dans Chrome → ⋮ → « Installer l'application ».
- Marche hors ligne. Les données restent sur l'appareil ; la synchronisation PC ↔ téléphone passe par le compte de l'utilisateur (Firebase).
- Aucune donnée personnelle dans ce dépôt : tout vient des réglages de l'utilisateur.

## Application Android

- Le code est dans `android/` : une WebView qui charge ce site, plus les rappels sonores (adhan, adhkar, thumun), les boutons dans les notifications et le widget.
- GitHub Actions construit `nhari.apk` et le publie dans la release « android ».
- La clé de signature n'est dans le dépôt que chiffrée (`android/app/nhari.jks.enc`). Son mot de passe est le secret `NHARI_KS_PASS` du dépôt ; sans lui, le code est seulement compilé et rien n'est publié.
