let messages = {
  'fr': {
    'front.upload': 'Sélectionnez des photos pour commencer votre album',
    'front.title': 'Choisissez un titre pour votre album',
    'front.step1': "Etape 1.",
    'front.step2': "Etape 2.",

    'ui.uploading': 'Chargement...',
    'ui.processing': 'Traitement...',

    'nav.save': 'Sauvegarder pour plus tard',
    'nav.order': "Commander l'album",
    'nav.try': "Essayer avec mes photos",
    'nav.add': "Ajouter des photos",

    'ui.move': "Déplacer la photo sur cette page",
    'ui.copy': "Copier la photo sur cette page",
    'ui.add': 'Ajouter des photos',
    'ui.shuffle': "Mélanger",
    'ui.title': 'Cliquez ici pour changer le titre...',
    'ui.cover': 'Page de couverture',
    'ui.page': 'Page',

    'toolbar.cover': 'Ajouter la photo à la couverture',
    'toolbar.remove': 'Supprimer la photo',
    'toolbar.cancel': 'Annuler',
    'toolbar.rotate': 'Tourner la photo',

    'upload.dragclick': "Glissez et déposez les photos, ou cliquez ici",

    'order.firstname': 'Prénom',
    'order.lastname': 'Nom de famille',
    'order.email': 'Email',
    'order.email-placeholder': 'nom@example.com',
    'order.address': 'Adresse',
    'order.street': 'Rue & numéro',
    'order.zip': 'Code postal',
    'order.city': 'Ville',
    'order.country': "Pays",
    'order.validate': "Valider la méthode de paiement",
    'order.desc1': "Le prix inclue l'impression et les frais de port",
    'order.desc2': "Vous ne serez débiter seulement quand la commande est confirmée et imprimée.",
    'order.submitting': "Envoi de votre commande...",
    'order.ordered': "Votre album a été commande !",
    'order.confirmation': "Vous recevrez un email confirmant votre commande, et nous vous tiendrons au courant de l'avancement. Merci !",
    'order.close': "Fermer",
    'order.notnow': "Plus tard"
  },

  'en': {
    'front.upload': 'Upload some photos to start your album',
    'front.title': 'Choose a title for your album',
    'front.step1': "Step 1.",
    'front.step2': "Step 2.",

    'ui.uploading': 'Uploading...',
    'ui.processing': 'Processing...',

    'nav.save': 'Save for later',
    'nav.order': 'Order album',
    'nav.try': 'Try with my photos',
    'nav.add': 'Add more photos',

    'ui.move': "Move photo to this page",
    'ui.copy': "Copy photo to this page",
    'ui.add': 'Add more photos',
    'ui.shuffle': "Shuffle",
    'ui.title': 'Click here to change the album title...',
    'ui.cover': 'Cover page',
    'ui.page': 'Page',

    'toolbar.cover': 'Add photo to album cover',
    'toolbar.remove': 'Remove photo',
    'toolbar.cancel': 'Cancel',
    'toolbar.rotate': 'Rotate photo',

    'upload.dragclick': "Drag to upload or click here",

    'order.firstname': 'First Name',
    'order.lastname': 'Last Name',
    'order.email': 'Email',
    'order.email-placeholder': 'name@example.com',
    'order.address': 'Address',
    'order.street': 'Street & number',
    'order.zip': 'Zip Code',
    'order.city': 'City',
    'order.country': "Country",
    'order.validate': "Validate payment method",
    'order.desc1': 'This price includes printing and shipping.',
    'order.desc2': 'You will not be charged until your order is processed and printed.',
    'order.submitting': "Submitting your order...",
    'order.ordered': "Your album has been ordered!",
    'order.confirmation': "You will receive an email to confirm your order, and will be notified when your order has been processed. Thank you!",
    'order.close': "Close",
    'order.notnow': "Not now"
  }
};


function getLang() {
  let def = 'en';
  let lang = document.documentElement.lang || def;

  return function(key) {
    return messages[lang][key] || messages[def][key] || '';
  };
}

module.exports = getLang();
