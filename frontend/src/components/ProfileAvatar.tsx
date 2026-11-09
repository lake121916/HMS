import React from 'react';
import api from '../services/api';

interface ProfileAvatarProps {
  userId: number;
  hasPhoto: boolean;
  photoVersion?: string | null;
  initials: string;
  className: string;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  userId,
  hasPhoto,
  photoVersion,
  initials,
  className
}) => {
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setPhotoUrl(null);

    if (hasPhoto) {
      api.get(`/auth/profile-photo/${userId}`, { responseType: 'blob' })
        .then(response => {
          if (active) {
            objectUrl = URL.createObjectURL(response.data);
            setPhotoUrl(objectUrl);
          }
        })
        .catch(() => {
          if (active) setPhotoUrl(null);
        });
    }

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hasPhoto, photoVersion, userId]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {photoUrl ? (
        <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
};

export default ProfileAvatar;
