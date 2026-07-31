'use client';

import { useEffect, useState } from 'react';
import { fetchPhotoBlob } from '../lib/api';
import { PhotoPreuve as PhotoPreuveType } from '../lib/types';

/**
 * Vignette d'une photo de constat scellée en WORM.
 *
 * La fiche affichait deux cartes fictives, « IMG_001.jpg » et « IMG_002.jpg »,
 * écrites en dur — indépendamment de toute preuve réellement archivée.
 *
 * Le contenu est récupéré par `fetch` avec le jeton de session : l'endpoint est
 * protégé, et un `<img src>` ne sait pas porter d'en-tête d'autorisation.
 */
export function PhotoPreuve({ ncrId, photo }: { ncrId: string; photo: PhotoPreuveType }) {
  const [url, setUrl] = useState<string | null>(null);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    let actif = true;
    let objectUrl: string | null = null;

    fetchPhotoBlob(ncrId, photo.id).then((resultat) => {
      if (!actif) {
        // Le composant a été démonté pendant la requête : libérer tout de suite.
        if (resultat) URL.revokeObjectURL(resultat);
        return;
      }
      if (resultat) {
        objectUrl = resultat;
        setUrl(resultat);
      } else {
        setEchec(true);
      }
    });

    return () => {
      actif = false;
      // Sans révocation, chaque rafraîchissement de la fiche laisserait un blob
      // en mémoire du navigateur.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [ncrId, photo.id]);

  return (
    <figure className="proof-card proof-photo">
      {url ? (
        // `next/image` optimise depuis une URL distante connue à la compilation ;
        // ici la source est un blob créé à l'exécution, donc une balise native.
        <img src={url} alt={`Preuve photographique du ${photo.date}`} />
      ) : (
        <span>{echec ? 'Contenu indisponible' : 'Chargement…'}</span>
      )}
      <figcaption>
        {photo.date}
        {photo.latitude !== null && photo.longitude !== null && (
          <> · {photo.latitude.toFixed(4)}, {photo.longitude.toFixed(4)}</>
        )}
        {photo.scellee && <span className="worm-badge locked">WORM</span>}
      </figcaption>
    </figure>
  );
}
