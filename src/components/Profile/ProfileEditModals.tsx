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
            propertyId={editProperty?.id}
          />
        </Modal>
      )}

      {showEditPostModal && (
        <Modal visible={showEditPostModal}>
          <CreatePost
            post={editPost || undefined}
            onBack={onCloseEditPost}
          />
        </Modal>
      )}

      {showEditReelModal && (
        <Modal visible={showEditReelModal}>
          <CreateReel reelId={editReel?.id} onBack={onCloseEditReel} />
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
