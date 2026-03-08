import React from 'react';
import { UserIcon } from 'lucide-react';

interface UserAvatarProps {
  name: string;
  avatar?: string;
  size?: 'sm' | 'md';
}

export function UserAvatar({ name, avatar, size = 'md' }: UserAvatarProps) {
  const sizeClasses = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  
  return (
    <div className="flex items-center gap-2">
      {avatar ? (
        <img
          src={avatar}
          alt={name}
          className={`${sizeClasses} rounded-full object-cover flex-shrink-0`}
          onError={(e) => {
            // 头像加载失败时显示默认头像
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-full bg-slate-600 flex items-center justify-center text-white font-medium flex-shrink-0`}
        >
          {name ? name.charAt(0) : <UserIcon className="w-4 h-4" />}
        </div>
      )}
      <span className="text-sm text-slate-200 font-medium truncate">
        {name}
      </span>
    </div>
  );
}

export default UserAvatar;
