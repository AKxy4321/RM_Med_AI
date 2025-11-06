import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Stethoscope,
  Shield,
  Calendar,
  Activity,
} from "lucide-react";
import { auth, db } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
} from "firebase/auth";
import {
  setDoc,
  doc,
  getDoc,
  query,
  where,
  collection,
  getDocs,
  updateDoc,
} from "firebase/firestore";

const Login = () => {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    recoveryQuestion: "",
    recoveryAnswer: "",
    newPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      recoveryQuestion: "",
      recoveryAnswer: "",
      newPassword: "",
    });
    setError("");
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (mode === "register") {
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            formData.email,
            formData.password
          );
          const user = userCredential.user;

          await setDoc(doc(db, "users", user.uid), {
            name: formData.name || "New User",
            email: formData.email,
            type: "patient",
            recoveryQuestion: formData.recoveryQuestion,
            recoveryAnswer: formData.recoveryAnswer.toLowerCase(),
            createdAt: new Date().toISOString(),
          });

          setMode("login");
          resetForm();
        } catch (err) {
          if (err.code === "auth/email-already-in-use") {
            setError(
              "An account with this email already exists. You can log in or use 'Forgot Password' to reset your password."
            );
          } else if (err.code === "auth/invalid-email") {
            setError("Please enter a valid email address.");
          } else if (err.code === "auth/weak-password") {
            setError("Password should be at least 6 characters long.");
          } else {
            setError("Registration failed. Please try again later.");
          }
        }
      }

      else if (mode === "login") {
        try {
          const userCredential = await signInWithEmailAndPassword(
            auth,
            formData.email,
            formData.password
          );
          const user = userCredential.user;

          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          const userData = docSnap.exists() ? docSnap.data() : {};

          localStorage.setItem(
            "user",
            JSON.stringify({
              id: user.uid,
              name: userData.name || "Patient",
              email: userData.email,
              type: userData.type || "patient",
              avatar: "👩‍💼",
            })
          );

          navigate("/dashboard");
        } catch (err) {
          if (err.code === "auth/invalid-credential") {
            setError("Incorrect email or password. Please try again.");
          } else if (err.code === "auth/user-not-found") {
            setError("No account found with this email. Please register first.");
          } else {
            setError("Unable to log in at the moment. Please try again later.");
          }
        }
      }

      else if (mode === "forgot") {
        const q = query(collection(db, "users"), where("email", "==", formData.email));
        const snap = await getDocs(q);
        if (snap.empty) return setError("No account found with this email.");

        const userDoc = snap.docs[0];
        const data = userDoc.data();

        if (
          data.recoveryAnswer.toLowerCase() !==
          formData.recoveryAnswer.toLowerCase()
        ) {
          return setError("Incorrect recovery answer.");
        }

        const tempLogin = await signInWithEmailAndPassword(
          auth,
          formData.email,
          formData.password || formData.newPassword
        ).catch(() => null);

        const user = auth.currentUser;
        if (user) {
          await updatePassword(user, formData.newPassword);
        }

        await updateDoc(doc(db, "users", userDoc.id), {
          passwordHint: formData.newPassword,
        });

        setMode("login");
        resetForm();
      }
    } finally {
      setLoading(false);
    }
  };

  const FeatureCard = ({ icon: Icon, title, description, delay }) => (
    <div
      className="flex items-start space-x-4 p-6 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex-shrink-0">
        <div className="p-3 bg-white/20 rounded-xl">
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex-1">
        <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
        <p className="text-white/80 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );

  const renderForm = () => {
    switch (mode) {
      case "register":
        return (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Create Account
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                className="input-field"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="input-field"
                required
              />
              <input
                type="text"
                name="recoveryQuestion"
                placeholder="Security Question (e.g. Mother's name?)"
                value={formData.recoveryQuestion}
                onChange={handleChange}
                className="input-field"
                required
              />
              <input
                type="text"
                name="recoveryAnswer"
                placeholder="Answer"
                value={formData.recoveryAnswer}
                onChange={handleChange}
                className="input-field"
                required
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Creating..." : "Register"}
              </button>
              <p className="text-center text-sm mt-3">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="text-primary-600"
                >
                  Sign In
                </button>
              </p>
            </form>
          </>
        );

      case "forgot":
        return (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Recover Password
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                type="email"
                name="email"
                placeholder="Registered Email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                required
              />
              <input
                type="text"
                name="recoveryAnswer"
                placeholder="Answer to your recovery question"
                value={formData.recoveryAnswer}
                onChange={handleChange}
                className="input-field"
                required
              />
              <input
                type="password"
                name="newPassword"
                placeholder="New Password"
                value={formData.newPassword}
                onChange={handleChange}
                className="input-field"
                required
              />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Verifying..." : "Reset Password"}
              </button>
              <p className="text-center text-sm mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="text-primary-600"
                >
                  Back to Login
                </button>
              </p>
            </form>
          </>
        );

      default:
        return (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome Back
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                required
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-gray-500"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </button>
              <div className="flex justify-between text-sm mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setError("");
                  }}
                  className="text-primary-600"
                >
                  Forgot Password?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className="text-primary-600"
                >
                  Create Account
                </button>
              </div>
            </form>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-primary-50">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-3 mb-3">
              <div className="p-3 bg-gradient-to-r from-primary-600 to-medical-500 rounded-2xl shadow-lg">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-medical-500 bg-clip-text text-transparent">
                MediSense
              </h1>
            </div>
            <p className="text-gray-600">AI Healthcare Assistant</p>
          </div>

          {renderForm()}
        </div>
      </div>

      <div className="flex-1 bg-gradient-to-br from-primary-600 via-primary-700 to-medical-600 hidden lg:flex flex-col justify-center p-12">
        <div className="max-w-2xl mx-auto space-y-6">
          <FeatureCard
            icon={Activity}
            title="AI Symptom Analysis"
            description="Instant, intelligent insights for your health."
            delay={400}
          />
          <FeatureCard
            icon={Calendar}
            title="Smart Scheduling"
            description="Book appointments dynamically."
            delay={600}
          />
          <FeatureCard
            icon={Shield}
            title="Emergency Support"
            description="24/7 detection and care."
            delay={800}
          />
        </div>
      </div>
    </div>
  );
};

export default Login;
