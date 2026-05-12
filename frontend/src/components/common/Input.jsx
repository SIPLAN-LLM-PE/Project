export const Input = ({ label, icon: Icon, ...props }) => {
  return (
    <div className="w-full mb-4 text-left">
      <label className="block text-[10px] font-bold text-[#4a5568] uppercase tracking-widest mb-1.5 ml-1">
        {label}
      </label>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2546b0] transition-colors">
          <Icon size={18} />
        </div>
        <input
          {...props}
          className="w-full pl-10 pr-4 py-2.5 border border-[#cbd5e0] rounded-lg text-sm text-gray-700 focus:outline-none focus:border-[#2546b0] focus:ring-1 focus:ring-[#2546b0] transition-all placeholder:text-gray-300"
        />
      </div>
    </div>
  );
};