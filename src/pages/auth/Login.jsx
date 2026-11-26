import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Swal from "sweetalert2";
import { loginRequest } from "../../utils/api";
import { saveSession } from "../../utils/auth";
import Logo from "../../components/Logo";

const toast = (icon, title, text, timer) =>
  Swal.fire({
    toast: true,
    position: "top-end",
    icon,
    title,
    text,
    showConfirmButton: false,
    timer,
    timerProgressBar: true
  });

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      username: "",
      password: ""
    }
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const result = await loginRequest(data.username, data.password);
      saveSession(result.token, result.expiresIn);
      setLoading(false);
      toast("success", result.message || "Login successful", "", 1500);
      setTimeout(() => navigate("/admin/data-upload"), 1500);
    } catch (error) {
      setLoading(false);
      toast(
        "error",
        "Login failed",
        error.message || "Something went wrong. Please try again.",
        2500
      );
    }
  };


  return (
    <div className="min-h-screen w-full bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200/90 rounded-2xl shadow-xl shadow-slate-200/50 p-6 sm:p-8">
        {/* Brand Logo */}
        <div className="mb-6 flex justify-center">
          <Logo light={true} />
        </div>

        <div className="text-center pb-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign in to access your MH State Energy Calculator
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div className="relative">
            <label className="block text-gray-700 text-sm font-medium mb-1.5">
              Username
            </label>
            <input
              type="text"
              className="text-sm text-gray-900  w-full py-2.5 px-3.5 rounded-lg bg-gray-50 border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              placeholder="Enter your username"
              {...register("username", { required: "Username is required" })}
            />
            {errors.username && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="relative">
            <label className="block text-gray-700 text-sm font-medium mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="text-sm text-gray-900 w-full py-2.5 px-3.5 rounded-lg bg-gray-50 border border-gray-200 placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition pr-10"
                placeholder="Enter your password"
                {...register("password", { required: "Password is required" })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-600 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#2563eb] hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg shadow-sm hover:shadow transition duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              "Sign In"
            )}
          </button>


        </form>
      </div>
    </div>
  );
};

export default Login;
