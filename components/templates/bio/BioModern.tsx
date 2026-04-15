import { ExternalLink, Instagram, Facebook, Globe, MessageCircle } from 'lucide-react';

export default function BioModern({ data }: any) {
  
  // 🚀 FUNCIÓN MÁGICA: Evita que el link se pegue al localhost
  const formatExternalLink = (url: string) => {
    if (!url) return "#";
    const cleanUrl = url.trim();
    if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) {
      return cleanUrl;
    }
    return `https://${cleanUrl}`;
  };

  const getIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('instagram')) return <Instagram size={14} />;
    if (l.includes('facebook')) return <Facebook size={14} />;
    if (l.includes('web') || l.includes('sitio')) return <Globe size={14} />;
    if (l.includes('whatsapp') || l.includes('pedir')) return <MessageCircle size={14} />;
    return <ExternalLink size={14} />;
  };

  return (
    // 🚀 HEMOS ELIMINADO EL estilo inline que aplicaba el fondo
    // Esto hace que el componente sea transparente y se vea el fondo del celular
    <div className="w-full flex flex-col items-center px-4 pb-12 animate-in fade-in duration-700 min-h-full">
      
      {/* 🔗 BOTONES CON ESTILOS DINÁMICOS */}
      <div className="w-full space-y-4 pt-2">
        {data.snappylink_links?.map((link: any, i: number) => (
          <a
            key={i}
            href={formatExternalLink(link.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="group w-full p-3.5 rounded-full border-2 flex items-center transition-all duration-300 hover:scale-[1.02] active:scale-95 bg-white"
            style={{ 
              backgroundColor: '#ffffff', // Fondo del botón blanco para que resalte la sombra
              borderColor: data.snappylink_btn_color || data.theme_color || '#000000',
              color: data.snappylink_btn_text_color || '#000000',
              boxShadow: `4px 4px 0px ${data.snappylink_shadow_color || '#000000'}`
            }}
          >
            {/* El icono ahora sigue el color de texto elegido para el botón */}
            <div 
              className="w-8 flex justify-center opacity-40 group-hover:opacity-100 transition-opacity"
              style={{ color: data.snappylink_btn_text_color || '#000000' }}
            >
              {getIcon(link.label)}
            </div>
            
            <div className="flex-1 pr-8 text-center">
              <span className="text-[11px] font-black uppercase tracking-tight leading-tight">
                {link.label}
              </span>
            </div>
          </a>
        ))}
      </div>

      {/* 📱 REDES SOCIALES */}
      <div className="flex flex-wrap justify-center gap-5 pt-8">
        {data.instagram && (
          <a href={formatExternalLink(data.instagram)} target="_blank" className="p-2.5 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 hover:text-black hover:bg-white transition-all shadow-sm">
            <Instagram size={18} />
          </a>
        )}
        {data.facebook && (
          <a href={formatExternalLink(data.facebook)} target="_blank" className="p-2.5 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 hover:text-black hover:bg-white transition-all shadow-sm">
            <Facebook size={18} />
          </a>
        )}
        {data.tiktok && (
          <a href={formatExternalLink(data.tiktok)} target="_blank" className="p-2.5 rounded-full bg-white/80 backdrop-blur-sm text-gray-600 hover:text-black hover:bg-white transition-all shadow-sm">
            <Globe size={18} />
          </a>
        )}
      </div>
    </div>
  );
}