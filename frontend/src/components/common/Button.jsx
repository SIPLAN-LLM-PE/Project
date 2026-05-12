import { LogIn } from 'lucide-react';

export const Button = ({ children, onClick, type = "button", loading = false }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className="w-full bg-[#2546b0] hover:bg-blue-800 text-white font-medium py-2.5 rounded-lg transition-all flex items-center justify-center text-sm shadow-md active:scale-95 disabled:opacity-70"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <>
          <LogIn className="w-4 h-4 mr-2" />
          {children}
        </>
      )}
    </button>
  );
};