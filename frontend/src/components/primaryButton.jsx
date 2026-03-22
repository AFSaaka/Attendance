import { Loader2 } from "lucide-react";

// Added 'type' prop to handle form submission
const PrimaryButton = ({
  children,
  onClick,
  disabled,
  isLoading,
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`
        w-full px-4 py-3 mt-3 rounded-lg text-base font-semibold text-white
        flex justify-center items-center gap-2.5
        transition-all duration-300
        ${
          disabled || isLoading
            ? "bg-gray-300 cursor-not-allowed"
            : "bg-[#198104] hover:bg-[#22a306] hover:shadow-[0_0_15px_rgba(25,129,4,0.4)] hover:-translate-y-px cursor-pointer"
        }
      `}
    >
      {isLoading ? (
        <>
          <Loader2 className="animate-spin" size={20} />
          Processing...
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default PrimaryButton;
