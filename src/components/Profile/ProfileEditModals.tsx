import React from "react";
import { Modal } from "react-native";
import CreateProperty from "../CreateContent/CreateProperty";
import CreatePost from "../CreateContent/CreatePost/CreatePost";
import CreateReel from "../CreateContent/CreateReel";
import { Post, Property, Reel } from "@/types";

export interface ProfileEditModalsProps {
  /** Propiedad seleccionada para ver detalle — ya no se usa (se navega por ruta). */
  selectedProperty?: Property | null;
  /** @deprecated Ya no se usa para ver detalle. */
  onCloseProperty?: () => void;
  handleSilentRefresh: () => void;

  showEditPropertyModal: boolean;
  editProperty: Property | null;
  onCloseEditProperty: (shouldRefresh?: boolean) => void;

  showEditPostModal: boolean;
  editPost: Post | null;
  onCloseEditPost: () => void;

  showEditReelModal: boolean;
  editReel: Reel | null;
  onCloseEditReel: () => void;

  showOpenHouseModal: boolean;
  openHousePost: Post | null;
  onCloseOpenHouseModal: () => void;

  /**
   * Refresca SOLO ese contenido en la cache del feed tras una edición exitosa.
   * Antes, editar invalidaba ["feed"] completo (refetch que reordenaba el feed por
   * engagement_score); con este parche puntual el feed se queda en su sitio y la
   * tarjeta muestra el dato nuevo al volver.
   */
  onFeedContentUpdated?: (contenidoId: string) => void;
}

export const ProfileEditModals: React.FC<ProfileEditModalsProps> = ({
  selectedProperty: _selectedProperty,
  onCloseProperty: _onCloseProperty,
  handleSilentRefresh,
  showEditPropertyModal,
  editProperty,
  onCloseEditProperty,
  showEditPostModal,
  editPost,
  onCloseEditPost,
  showEditReelModal,
  editReel,
  onCloseEditReel,
  showOpenHouseModal,
  openHousePost,
  onCloseOpenHouseModal,
  onFeedContentUpdated,
}) => {
  return (
    <>
      {showEditPropertyModal && (
        <Modal
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => onCloseEditProperty(false)}
          onDismiss={() => onCloseEditProperty(false)}
        >
          <CreateProperty
            onBack={(shouldRefresh) => onCloseEditProperty(shouldRefresh)}
            onUpdated={(id) => onFeedContentUpdated?.(id)}
            propertyId={editProperty?.id}
          />
        </Modal>
      )}

      {showEditPostModal && (
        <Modal visible={showEditPostModal}>
          <CreatePost
            post={editPost || undefined}
            onBack={onCloseEditPost}
            onUpdated={(id) => onFeedContentUpdated?.(id)}
          />
        </Modal>
      )}

      {showEditReelModal && (
        <Modal visible={showEditReelModal}>
          <CreateReel
            reelId={editReel?.id}
            onBack={onCloseEditReel}
            onUpdated={(id) => onFeedContentUpdated?.(id)}
          />
        </Modal>
      )}

      {showOpenHouseModal && openHousePost && (
        <Modal
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={onCloseOpenHouseModal}
          onDismiss={onCloseOpenHouseModal}
        >
          <CreatePost
            post={openHousePost}
            onBack={onCloseOpenHouseModal}
          />
        </Modal>
      )}
    </>
  );
};
