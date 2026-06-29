import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // <--- ESTA ES LA MÁS IMPORTANTE
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Por si acaso usas src
  ],
  theme: {
    extend: {
      colors: {
        fresco: '#1BB179',
        brasa: '#9A5532',
        ink: '#15160E',
        paper: '#F5F5EF',
        surface: '#ECEBE3',
        card: '#FFFFFF',
        border: '#DEDDD3',
        graphite: '#86877B',
        alert: '#FF4D3D',
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;