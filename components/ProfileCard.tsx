import Image from 'next/image';

// Definisikan tipe untuk properti profil
type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  website: string | null;
};

export default function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <div className="max-w-md mx-auto bg-[--card] rounded-2xl shadow-lg overflow-hidden">
      <div className="h-32 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
      <div className="p-6 -mt-16 flex justify-center">
        <Image
          className="rounded-full border-4 border-[--background] object-cover"
          src={profile.avatar_url || '/default-avatar.png'} // Sediakan avatar default
          alt={`Avatar for ${profile.full_name}`}
          width={128}
          height={128}
        />
      </div>
      <div className="text-center px-6 pb-6">
        <h1 className="text-2xl font-bold text-[--foreground]">{profile.full_name}</h1>
        <p className="text-gray-400 text-sm">@{profile.username}</p>
        
        {profile.website && (
          <div className="mt-4">
            <a 
              href={profile.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Kunjungi Website
            </a>
          </div>
        )}

        <div className="mt-6">
          <button className="btn btn-primary">
            Edit Profil
          </button>
        </div>
      </div>
    </div>
  );
}