import React from "react";
import { Modal } from "react-native";
import PropertyDetail from "../Details/PropertyDetail";
import CreateProperty from "../CreateContent/CreateProperty";
import CreatePost from "../CreateContent/CreatePost/CreatePost";
import CreateReel from "../CreateContent/CreateReel";
import { Post, Property, Reel } from "@/types";

export interface ProfileEditModalsProps {
  selectedProperty: Property | null;
  onCloseProperty: () => void;
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
  selectedProperty,
  onCloseProperty,
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
      {selectedProperty && (
        <Modal
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={onCloseProperty}
        >
          <PropertyDetail
            propertyId={selectedProperty.id}
            onRefresh={handleSilentRefresh}
          />
        </Modal>
      )}

      {showEditPropertyModal && (
        <Modal
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => onCloseEditProperty(false)}
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
