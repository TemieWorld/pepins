// Pépins & Trognons — données de démonstration
// Produits, prix, catégories ("univers") et copie réels, fournis par le client.

const UNIV = [
  { id: 'maison', name: 'Équipement de la maison', subs: 'cuisine · salon · entretien de la maison', img: 'photos/produits/maison-tablier-homard.jpg' },
  { id: 'hygiene', name: 'Hygiène & Beauté', subs: 'salle de bain · cosmétiques', img: 'photos/produits/hygiene-cigale-marseille.jpg' },
  { id: 'loisirs', name: 'Loisirs & Culture', subs: 'jouets pour enfants · loisirs pour les grands', img: 'photos/produits/loisirs-puzzle-omy.jpg' },
  { id: 'epicerie', name: "L'épicerie fine anti-gaspi", subs: 'une première en France', img: 'photos/produits/epicerie-pickles-courgettes.jpg', first: true },
];

const SLOTS = ['Matin · 10h – 13h', 'Après-midi · 13h – 16h', 'Fin de journée · 16h – 19h'];
const D = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DL = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const M = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><defs><pattern id="s" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="16" fill="#EDE2CF"/></pattern></defs><rect width="400" height="500" fill="#F3E8D6"/><rect width="400" height="500" fill="url(#s)"/><text x="200" y="258" text-anchor="middle" font-family="monospace" font-size="22" fill="#29378A">photo produit</text></svg>'
);

function seedData() {
  const P = 'photos/produits/';
  return {
    products: [
      { id: 'coffret', name: 'Coffret « les basiques » de la cuisine', maker: 'Nogent', price: 29.9, univ: 'maison', img: P + 'maison-coffret-basiques-cuisine.jpg', stock: 6, min: 3, origine: '' },
      { id: 'tablier', name: 'Tablier « Homard »', maker: null, price: 34.9, univ: 'maison', img: P + 'maison-tablier-homard.jpg', stock: 2, min: 3, origine: '' },
      { id: 'cigale', name: 'La Cigale de Marseille', maker: null, price: 5.5, univ: 'hygiene', img: P + 'hygiene-cigale-marseille.jpg', stock: 24, min: 10, origine: '' },
      { id: 'gelee', name: 'Gelée nettoyante visage', maker: 'Cozie', price: 17.5, univ: 'hygiene', img: P + 'hygiene-gelee-nettoyante.jpg', stock: 0, min: 4, origine: '' },
      { id: 'puzzle', name: 'Puzzle 1000 pièces', maker: 'OMY', price: 34.9, univ: 'loisirs', img: P + 'loisirs-puzzle-omy.jpg', stock: 5, min: 2, origine: '' },
      { id: 'pickles', name: 'Pickles de courgettes', maker: 'La Conserverie Locale', price: 4.9, univ: 'epicerie', img: P + 'epicerie-pickles-courgettes.jpg', stock: 11, min: 6, origine: '' },
    ],
    resas: [
      { code: 'PT-3107', prenom: 'Camille', phone: '06 12 48 90 33', email: 'camille.r@exemple.fr', day: 'mar. 29 sept.', until: '1 oct.', untilLong: 'mercredi 1 oct.', slot: 'Fin de journée · 16h – 19h', gift: true, items: [{ id: 'coffret', qty: 1 }], status: 'prep', created: 'hier à 18:04' },
      { code: 'PT-3104', prenom: 'Julien', phone: '07 81 22 05 64', email: 'julien.m@exemple.fr', day: 'mer. 30 sept.', until: '2 oct.', untilLong: 'jeudi 2 oct.', slot: 'Matin · 10h – 13h', gift: false, items: [{ id: 'puzzle', qty: 1 }], status: 'prep', created: 'hier à 11:20' },
      { code: 'PT-3099', prenom: 'Nadia', phone: '06 55 71 18 02', email: 'nadia.b@exemple.fr', day: 'lun. 28 sept.', until: '30 sept.', untilLong: 'mardi 30 sept.', slot: 'Après-midi · 13h – 16h', gift: false, items: [{ id: 'cigale', qty: 2 }], status: 'ready', created: 'sam. à 15:47' },
      { code: 'PT-3091', prenom: 'Léa', phone: '06 03 44 67 91', email: 'lea.d@exemple.fr', day: 'sam. 26 sept.', until: '28 sept.', untilLong: 'lundi 28 sept.', slot: 'Matin · 10h – 13h', gift: true, items: [{ id: 'pickles', qty: 3 }], status: 'done', created: 'jeu. à 09:12' },
      { code: 'PT-3084', prenom: 'Marc', phone: '07 12 90 38 45', email: 'marc.l@exemple.fr', day: 'mer. 23 sept.', until: '25 sept.', untilLong: 'vendredi 25 sept.', slot: 'Fin de journée · 16h – 19h', gift: false, items: [{ id: 'tablier', qty: 1 }], status: 'expired', created: 'mar. à 19:02' },
    ],
    log: [
      { day: "Aujourd'hui", time: '14:32', pname: 'La Cigale de Marseille', chip: '26 → 24', reason: 'Vente en boutique', user: 'Simon' },
      { day: "Aujourd'hui", time: '11:05', pname: 'Gelée nettoyante visage', chip: '1 → 0', reason: 'Vente en boutique', user: 'Christopher' },
      { day: "Aujourd'hui", time: '10:12', pname: 'Pickles de courgettes', chip: '5 → 11', reason: 'Réassort', user: 'Christopher' },
      { day: 'Hier', time: '18:40', pname: 'Tablier « Homard »', chip: '3 → 2', reason: 'Vente en boutique', user: 'Simon' },
      { day: 'Hier', time: '16:02', pname: 'Puzzle 1000 pièces', chip: '6 → 5', reason: 'Vente en boutique', user: 'Simon' },
      { day: 'Hier', time: '09:58', pname: 'Coffret « les basiques » de la cuisine', chip: '2 → 6', reason: 'Réassort', user: 'Christopher' },
    ],
  };
}
