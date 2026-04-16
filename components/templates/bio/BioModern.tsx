import { ExternalLink, Instagram, Facebook, Globe, MessageCircle, Music2 } from 'lucide-react';

export default function BioModern({ data }: any) {
  
  const formatExternalLink = (url: string, type?: string) => {
    if (!url) return "#";
    const cleanUrl = url.trim();
    if (type === 'whatsapp' || url.length < 15 && !url.includes('.')) {
        return `https://wa.me/${cleanUrl.replace(/\D/g, '')}`;
    }
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) return cleanUrl;
    return `https://${cleanUrl}`;
  };

  const getIcon = (type: string) => {
    switch (type) {
        case 'instagram': return <Instagram size={22} strokeWidth={1.5} />;
        case 'tiktok': return <Music2 size={22} strokeWidth={1.5} />;
        case 'facebook': return <Facebook size={22} strokeWidth={1.5} />;
        case 'whatsapp': return <MessageCircle size={22} strokeWidth={1.5} />;
        case 'web': return <Globe size={22} strokeWidth={1.5} />;
        default: return <ExternalLink size={22} strokeWidth={1.5} />;
    }
  };

  // 🚀 El grid que combina los fijos con los extras
  const SocialGrid = () => (
    <div className="flex flex-wrap justify-center gap-6 py-6 w-full animate-in fade-in duration-500">
        {/* Los 4 fijos de siempre */}
        {data.instagram && <a href={formatExternalLink(data.instagram)} target="_blank" className="transition-all hover:scale-110" style={{ color: data.snappylink_btn_color || '#000000' }}><Instagram size={22} strokeWidth={1.5} /></a>}
        {data.tiktok && <a href={formatExternalLink(data.tiktok)} target="_blank" className="transition-all hover:scale-110" style={{ color: data.snappylink_btn_color || '#000000' }}><Music2 size={22} strokeWidth={1.5} /></a>}
        {data.facebook && <a href={formatExternalLink(data.facebook)} target="_blank" className="transition-all hover:scale-110" style={{ color: data.snappylink_btn_color || '#000000' }}><Facebook size={22} strokeWidth={1.5} /></a>}
        {data.phone && <a href={formatExternalLink(data.phone, 'whatsapp')} target="_blank" className="transition-all hover:scale-110" style={{ color: data.snappylink_btn_color || '#000000' }}><MessageCircle size={22} strokeWidth={1.5} /></a>}

        {/* Los extras dinámicos */}
        {data.snappylink_social_links?.map((social: any, i: number) => (
            social.url && (
                <a key={i} href={formatExternalLink(social.url, social.type)} target="_blank" className="transition-all hover:scale-110" style={{ color: data.snappylink_btn_color || '#000000' }}>
                    {getIcon(social.type)}
                </a>
            )
        ))}
    </div>
  );

  return (
    <div className="w-full flex flex-col items-center px-4 pb-12 animate-in fade-in duration-700 min-h-full">
      
      {data.snappylink_social_pos === 'top' && <SocialGrid />}

      <div className="w-full space-y-4 pt-2">
        {data.snappylink_links?.map((link: any, i: number) => (
          <a
            key={i}
            href={formatExternalLink(link.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="group w-full p-3.5 rounded-full border-2 flex items-center transition-all bg-white"
            style={{ 
              borderColor: data.snappylink_btn_color || '#000000',
              color: data.snappylink_btn_text_color || '#000000',
              boxShadow: `4px 4px 0px ${data.snappylink_shadow_color || '#000000'}`
            }}
          >
            <div className="w-8 flex justify-center opacity-40 group-hover:opacity-100" style={{ color: data.snappylink_btn_text_color }}><ExternalLink size={14} /></div>
            <div className="flex-1 pr-8 text-center"><span className="text-[11px] font-black uppercase tracking-tight leading-tight">{link.label}</span></div>
          </a>
        ))}
      </div>

      {(data.snappylink_social_pos === 'bottom' || !data.snappylink_social_pos) && <SocialGrid />}
      
    </div>
  );
}