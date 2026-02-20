import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "../../../components/Portal";
import { showAlert } from "../../../services/notificationService";
import Swal from "sweetalert2";

const DEFAULT_FORM = {
  username: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  phone: "",
  contact_information: "",
  department: "",
  position: "",
  password: "",
  password_confirmation: "",
  is_active: true,
  reason_for_deactivation: "",
};

const DirectorFormModal = ({
  editingDirector,
  existingDirector: propExistingDirector = [],
  onSubmit,
  onClose,
  actionLock,
}) => {
  const token = useMemo(() => localStorage.getItem("token"), []);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [isClosing, setIsClosing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [existingDirector, setExistingDirector] = useState(propExistingDirector);
  const [directorLoading, setDirectorLoading] = useState(propExistingDirector.length === 0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasLetter: false,
    hasNumber: false,
  });

  const isEdit = !!editingDirector;
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const fileInputRef = useRef(null);
  const previewUrlRef = useRef(null);
  const initialStateRef = useRef(DEFAULT_FORM);
  const reasonForDeactivationRef = useRef(null);

  const formatContactPhone = (value) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, "");

    // Limit to 11 digits
    const limited = digits.slice(0, 11);

    // Format as 0951-341-9336
    if (limited.length <= 4) {
      return limited;
    } else if (limited.length <= 7) {
      return `${limited.slice(0, 4)}-${limited.slice(4)}`;
    } else {
      return `${limited.slice(0, 4)}-${limited.slice(4, 7)}-${limited.slice(
        7
      )}`;
    }
  };

  const validatePassword = (value) => {
    const validation = {
      minLength: value.length >= 8,
      hasLetter: /[a-zA-Z]/.test(value),
      hasNumber: /[0-9]/.test(value),
    };

    setPasswordValidation(validation);

    // Return true only if all validations pass
    return validation.minLength && validation.hasLetter && validation.hasNumber;
  };

  const validators = {
    username: (value) => {
      if (!value.trim()) return "Username is required";

      // Ensure existingDirector is an array before using .find()
      if (!Array.isArray(existingDirector)) {
        return "";
      }

      // Check for duplicate username (excluding current director in edit mode)
      const duplicate = existingDirector.find(
        (p) =>
          p.username &&
          p.username.toLowerCase() === value.trim().toLowerCase() &&
          (!isEdit || p.id !== editingDirector?.id)
      );
      if (duplicate) {
        return "This username is already taken";
      }
      return "";
    },
    first_name: (value) => (value.trim() ? "" : "First name is required"),
    last_name: (value) => (value.trim() ? "" : "Last name is required"),
    department: (value) => (value.trim() ? "" : "Department is required"),
    position: (value) => (value.trim() ? "" : "Position is required"),
    phone: (value) => {
      if (!value) return "";
      const digits = value.replace(/\D/g, "");
      if (digits.length === 0) return "";
      if (digits.length !== 11) {
        return "Contact number must be exactly 11 digits (e.g., 0951-341-9336)";
      }
      return "";
    },
    password: (value) => {
      if (!isEdit && !value) {
        return "Password is required";
      }
      if (value && value.length < 8) {
        return "Password must be at least 8 characters";
      }
      if (value && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value)) {
        return "Password must include uppercase, lowercase, and a number";
      }
      // Real-time validation is handled by validatePassword function
      return "";
    },
    password_confirmation: (value) => {
      if (formData.password && value !== formData.password) {
        return "Passwords do not match";
      }
      return "";
    },
    reason_for_deactivation: (value) => {
      if (!formData.is_active && !value.trim()) {
        return "Reason for deactivation is required when account is inactive";
      }
      if (value && value.trim().length > 500) {
        return "Reason must not exceed 500 characters";
      }
      return "";
    },
  };

  const resolveAvatarUrl = useCallback((entity) => {
    if (!entity) return "";
    if (entity.avatar_path) {
      if (entity.avatar_path.startsWith("http://") || entity.avatar_path.startsWith("https://")) {
        return entity.avatar_path;
      }
      const apiBase =
        (
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        ).replace(/\/api\/?$/, "") + "/api";
      let cleanFilename = entity.avatar_path;
      if (entity.avatar_path.includes("director-avatars/")) {
        cleanFilename = entity.avatar_path.replace("director-avatars/", "");
      } else if (entity.avatar_path.includes("avatars/")) {
        cleanFilename = entity.avatar_path.replace("avatars/", "");
      }
      cleanFilename = cleanFilename.split("/").pop();
      return `${apiBase}/director-avatar/${cleanFilename}`;
    }
    return "";
  }, []);

  const fetchExistingDirector = useCallback(async () => {
    // If existingDirector was passed as prop, use it instead of fetching
    if (propExistingDirector.length > 0) {
      setExistingDirector(propExistingDirector);
      setDirectorLoading(false);
      return;
    }

    setDirectorLoading(true);
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        }/ict-admin/directors?per_page=1000`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Handle different response structures
        const directorList = Array.isArray(data.director)
          ? data.director
          : Array.isArray(data.data?.items)
          ? data.data.items
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        setExistingDirector(directorList);
      } else {
        throw new Error("Failed to load existing director");
      }
    } catch (error) {
      console.error(error);
      setExistingDirector([]);
    } finally {
      setDirectorLoading(false);
    }
  }, [token, propExistingDirector]);

  useEffect(() => {
    fetchExistingDirector();
  }, [fetchExistingDirector]);

  const computeHasChanges = (currentForm, file, removed) => {
    return (
      JSON.stringify(currentForm) !== JSON.stringify(initialStateRef.current) ||
      currentForm.password ||
      currentForm.password_confirmation ||
      file !== null ||
      removed
    );
  };

  const updateAvatarPreview = useCallback((source, isFile = false) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    if (!source) {
      setAvatarPreview("");
      return;
    }

    if (isFile) {
      const url = URL.createObjectURL(source);
      previewUrlRef.current = url;
      setAvatarPreview(url);
    } else {
      setAvatarPreview(source);
    }
  }, []);

  useEffect(() => {
    if (editingDirector) {
      const existingAvatar = resolveAvatarUrl(editingDirector);
      console.log("Director object:", editingDirector);
      console.log("Avatar path:", editingDirector.avatar_path);
      console.log("Resolved avatar URL:", existingAvatar);
      const phoneValue = editingDirector.phone || "";
      const formattedPhone = phoneValue ? formatContactPhone(phoneValue) : "";

      // Use first_name and last_name directly, fallback to splitting name if needed (for backward compatibility)
      const firstName =
        editingDirector.first_name ||
        (editingDirector.name ? editingDirector.name.split(" ")[0] : "") ||
        "";
      const lastName =
        editingDirector.last_name ||
        (editingDirector.name
          ? editingDirector.name.split(" ").slice(1).join(" ")
          : "") ||
        "";

      const directorFormState = {
        username: editingDirector.username || "",
        first_name: firstName,
        middle_name: editingDirector.middle_name || "",
        last_name: lastName,
        phone: formattedPhone,
        contact_information: editingDirector.contact_information || "",
        department: editingDirector.department || "",
        position: editingDirector.position || "",
        password: "",
        password_confirmation: "",
        is_active: editingDirector.is_active !== false, // Default to true if not explicitly false
        reason_for_deactivation: editingDirector.reason_for_deactivation || "",
      };
      setFormData(directorFormState);
      setAvatarFile(null);
      setAvatarRemoved(false);
      updateAvatarPreview(existingAvatar || "");
      initialStateRef.current = directorFormState;
      setHasUnsavedChanges(false);
      // Reset password validation
      setPasswordValidation({
        minLength: false,
        hasLetter: false,
        hasNumber: false,
      });
    } else {
      setFormData(DEFAULT_FORM);
      setAvatarFile(null);
      setAvatarRemoved(false);
      updateAvatarPreview("");
      initialStateRef.current = DEFAULT_FORM;
      setHasUnsavedChanges(false);
      // Reset password validation
      setPasswordValidation({
        minLength: false,
        hasLetter: false,
        hasNumber: false,
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [editingDirector, resolveAvatarUrl, updateAvatarPreview]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleChange = (e) => {
    const { name } = e.target;
    let { value } = e.target;

    if (name === "phone") {
      value = formatContactPhone(value);
    }

    // Handle password validation with real-time feedback
    if (name === "password") {
      validatePassword(value);
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      setHasUnsavedChanges(computeHasChanges(next, avatarFile, avatarRemoved));
      return next;
    });

    let errorMessage = "";
    if (name === "username") {
      if (!value.trim()) {
        errorMessage = "Username is required";
      } else {
        // Ensure existingDirector is an array before using .find()
        if (Array.isArray(existingDirector)) {
          const duplicate = existingDirector.find(
            (p) =>
              p.username &&
              p.username.toLowerCase() === value.trim().toLowerCase() &&
              (!isEdit || p.id !== editingDirector?.id)
          );
          if (duplicate) {
            errorMessage = "This username is already taken";
          }
        }
      }
    } else if (validators[name]) {
      errorMessage = validators[name](value);
    }

    setErrors((prev) => ({ ...prev, [name]: errorMessage }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({
        ...prev,
        avatar: "Only image files (PNG, JPG, GIF, SVG, WebP) are allowed",
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        avatar: "Please upload an image no larger than 2MB",
      }));
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setErrors((prev) => ({ ...prev, avatar: "" }));
    setAvatarRemoved(false);
    setAvatarFile(file);
    setHasUnsavedChanges(computeHasChanges(formData, file, false));
    updateAvatarPreview(file, true);
  };

  const handleAvatarClear = () => {
    setAvatarFile(null);
    setAvatarRemoved(true);
    setFormData((prev) => {
      const next = { ...prev };
      setHasUnsavedChanges(computeHasChanges(next, null, true));
      return next;
    });
    updateAvatarPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setErrors((prev) => ({ ...prev, avatar: "" }));
  };

  const validateForm = () => {
    const newErrors = {};

    const currentValidators = {
      username: (value) => {
        if (!value.trim()) return "Username is required";

        // Ensure existingDirector is an array before using .find()
        if (!Array.isArray(existingDirector)) {
          return "";
        }

        const duplicate = existingDirector.find(
          (p) =>
            p.username &&
            p.username.toLowerCase() === value.trim().toLowerCase() &&
            (!isEdit || p.id !== editingDirector?.id)
        );
        if (duplicate) {
          return "This username is already taken";
        }
        return "";
      },
      first_name: (value) => (value.trim() ? "" : "First name is required"),
      last_name: (value) => (value.trim() ? "" : "Last name is required"),
      department: (value) => (value.trim() ? "" : "Department is required"),
      position: (value) => (value.trim() ? "" : "Position is required"),
      phone: (value) => {
        if (!value) return "";
        const digits = value.replace(/\D/g, "");
        if (digits.length === 0) return "";
        if (digits.length !== 11) {
          return "Contact number must be exactly 11 digits (e.g., 0951-341-9336)";
        }
        return "";
      },
      password: (value) => {
        if (!isEdit && !value) {
          return "Password is required";
        }
        if (value) {
          // Use the passwordValidation state for real-time validation
          if (
            !passwordValidation.minLength ||
            !passwordValidation.hasLetter ||
            !passwordValidation.hasNumber
          ) {
            return "Password must meet all requirements";
          }
        }
        return "";
      },
      password_confirmation: (value) => {
        if (formData.password && value !== formData.password) {
          return "Passwords do not match";
        }
        return "";
      },
      reason_for_deactivation: (value) => {
        if (!formData.is_active && !value.trim()) {
          return "Reason for deactivation is required when account is inactive";
        }
        if (value && value.trim().length > 500) {
          return "Reason must not exceed 500 characters";
        }
        return "";
      },
    };

    Object.entries(currentValidators).forEach(([field, validator]) => {
      const message = validator(formData[field] || "");
      if (message && message.trim()) {
        newErrors[field] = message;
      }
    });

    if (!formData.username || !formData.username.trim()) {
      newErrors.username = "Username is required";
    }
    if (!formData.first_name || !formData.first_name.trim()) {
      newErrors.first_name = "First name is required";
    }
    if (!formData.last_name || !formData.last_name.trim()) {
      newErrors.last_name = "Last name is required";
    }
    if (!formData.department || !formData.department.trim()) {
      newErrors.department = "Department is required";
    }
    if (!formData.position || !formData.position.trim()) {
      newErrors.position = "Position is required";
    }

    if (!formData.is_active && !formData.reason_for_deactivation.trim()) {
      newErrors.reason_for_deactivation =
        "Reason for deactivation is required when account is inactive";
    }

    const filteredErrors = {};
    Object.entries(newErrors).forEach(([field, message]) => {
      if (message && message.trim()) {
        filteredErrors[field] = message;
      }
    });

    setErrors(filteredErrors);

    if (Object.keys(filteredErrors).length > 0) {
      setTimeout(() => {
        const firstErrorField = Object.keys(filteredErrors)[0];
        const errorElement = document.querySelector(
          `[name="${firstErrorField}"]`
        );
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
          errorElement.focus();
        }
      }, 100);
      return { isValid: false, errors: filteredErrors };
    }

    return { isValid: true, errors: {} };
  };

  const buildFormPayload = () => {
    const payload = new FormData();

    // Send first_name, middle_name, and last_name separately
    payload.append("first_name", formData.first_name.trim());
    payload.append("last_name", formData.last_name.trim());
    if (formData.middle_name && formData.middle_name.trim()) {
      payload.append("middle_name", formData.middle_name.trim());
    }
    payload.append("username", formData.username);

    if (formData.phone) {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      payload.append("phone", phoneDigits);
    }

    // Department and position are now required
    payload.append("department", formData.department.trim());
    payload.append("position", formData.position.trim());
    payload.append(
      "contact_information",
      (formData.contact_information || "").trim()
    );

    // Add is_active status
    payload.append("is_active", formData.is_active ? "1" : "0");
    
    // Add reason_for_deactivation if inactive
    if (!formData.is_active && formData.reason_for_deactivation) {
      payload.append("reason_for_deactivation", formData.reason_for_deactivation.trim());
    }

    if (formData.password && formData.password.trim()) {
      payload.append("password", formData.password);
      if (formData.password_confirmation) {
        payload.append("password_confirmation", formData.password_confirmation);
      }
    }

    if (avatarFile) {
      payload.append("avatar", avatarFile);
    }
    if (avatarRemoved && !avatarFile) {
      payload.append("remove_avatar", "1");
    }
    if (isEdit) {
      payload.append("_method", "PUT");
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (directorLoading) {
      await Swal.fire({
        icon: "error",
        title: "Please wait",
        text: "Data is still loading. Please wait before submitting.",
        confirmButtonColor: "#dc3545",
        confirmButtonText: "OK",
        zIndex: 10002,
        customClass: {
          container: "swal2-container-modal",
        },
      });
      return;
    }

    const validationResult = validateForm();
    if (!validationResult.isValid) {
      const fieldLabels = {
        username: "Username",
        first_name: "First Name",
        middle_name: "Middle Name",
        last_name: "Last Name",
        phone: "Contact Number",
        contact_information: "Contact Information",
        department: "Department",
        position: "Position",
        password: "Password",
        password_confirmation: "Confirm Password",
        avatar: "Avatar",
        reason_for_deactivation: "Reason for Deactivation",
      };

      const errorList = Object.entries(validationResult.errors)
        .map(([field, message]) => {
          if (!message) return null;
          const fieldLabel = fieldLabels[field] || field;
          return `<li style="margin-bottom: 8px;"><strong>${fieldLabel}:</strong> ${message}</li>`;
        })
        .filter(Boolean)
        .join("");

      Swal.fire({
        title: "Validation Error",
        html: `
          <div style="text-align: left; color: var(--text-primary);">
            <p style="margin-bottom: 15px;">Please fix the following errors before submitting:</p>
            <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
              ${errorList}
            </ul>
          </div>
        `,
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "var(--primary-color)",
        background: "var(--background-white)",
        color: "var(--text-primary)",
        iconColor: "#dc3545",
        width: "500px",
        zIndex: 10002, // Higher than modal (9999-10001)
        customClass: {
          container: "swal2-container-modal",
        },
      });

      const formElement = document.querySelector(".modal-body");
      if (formElement) {
        formElement.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    const confirmation = await Swal.fire({
      icon: "question",
      title: isEdit ? "Update Director?" : "Create Director?",
      text: isEdit
        ? `Are you sure you want to update "${formData.first_name} ${formData.last_name}"? This will save all the changes you've made.`
        : `Are you sure you want to create a director account for "${formData.first_name} ${formData.last_name}"? Please verify all information is correct before proceeding.`,
      showCancelButton: true,
      confirmButtonColor: "var(--primary-color)",
      cancelButtonColor: "#6c757d",
      confirmButtonText: isEdit ? "Update Director" : "Create Director",
      cancelButtonText: "Cancel",
      reverseButtons: true,
      zIndex: 10002,
      customClass: {
        container: "swal2-container-modal",
      },
    });

    if (!confirmation.isConfirmed) {
      return;
    }

    setLoading(true);
    try {
      Swal.fire({
        title: isEdit ? "Updating Director" : "Creating Director",
        text: "Please wait while we save the director information...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        backdrop: true,
        didOpen: () => {
          Swal.showLoading();
        },
        zIndex: 10002,
        customClass: {
          container: "swal2-container-modal",
        },
      });

      // Ensure API base URL ends with /api
      const apiBase =
        (
          import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"
        ).replace(/\/api\/?$/, "") + "/api";

      const url = isEdit
        ? `${apiBase}/ict-admin/directors/${editingDirector.id}`
        : `${apiBase}/ict-admin/directors`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: buildFormPayload(),
      });

      const data = await response.json();
      Swal.close();

      if (response.ok && data.success) {
        await Swal.fire({
          icon: "success",
          title: isEdit ? "Director Updated" : "Director Created",
          text: isEdit
            ? "Director information has been updated successfully."
            : "Director has been created successfully.",
          confirmButtonColor: "var(--primary-color)",
          confirmButtonText: "OK",
          zIndex: 10002,
          customClass: {
            container: "swal2-container-modal",
          },
        });

        if (onSubmit) {
          onSubmit(data.data || data.director || data);
        }

        const refreshedAvatar = resolveAvatarUrl(data.data || data.director || data);
        const normalizedDirector = {
          username: (data.data || data.director || data).username || "",
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone || "",
          password: "",
          password_confirmation: "",
          is_active: formData.is_active,
        };
        initialStateRef.current = normalizedDirector;
        setFormData(normalizedDirector);
        setHasUnsavedChanges(false);
        setAvatarFile(null);
        setAvatarRemoved(false);
        updateAvatarPreview(refreshedAvatar || "");

        // Close modal after success
        await performClose();
      } else {
        if (data.errors) {
          const backendErrors = {};
          Object.keys(data.errors).forEach((key) => {
            backendErrors[key] = Array.isArray(data.errors[key])
              ? data.errors[key][0]
              : data.errors[key];
          });
          setErrors((prev) => ({ ...prev, ...backendErrors }));
        }

        const errorMessage =
          data.message || "Failed to save director information";
        await Swal.fire({
          icon: "error",
          title: "Error",
          text: errorMessage,
          confirmButtonColor: "#dc3545",
          confirmButtonText: "OK",
          zIndex: 10002, // Higher than modal (9999-10001)
          customClass: {
            container: "swal2-container-modal",
          },
        });
      }
    } catch (error) {
      Swal.close();
      console.error("Form submission error:", error);
      await Swal.fire({
        icon: "error",
        title: "Error",
        text:
          error.message ||
          "Failed to save director information. Please try again.",
        confirmButtonColor: "#dc3545",
        confirmButtonText: "OK",
        zIndex: 10002, // Higher than modal (9999-10001)
        customClass: {
          container: "swal2-container-modal",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const performClose = async () => {
    setIsClosing(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onClose();
  };

  const handleCloseAttempt = async () => {
    // If the admin toggled the account to inactive, require a reason before allowing close.
    // (Admin can still close by toggling back to Active.)
    if (!formData.is_active && !formData.reason_for_deactivation.trim()) {
      setErrors((prev) => ({
        ...prev,
        reason_for_deactivation:
          "Reason for deactivation is required when account is inactive",
      }));

      await Swal.fire({
        icon: "warning",
        title: "Reason required",
        text: "Please provide a reason for deactivation before closing this form (or switch the account back to Active).",
        confirmButtonColor: "var(--primary-color)",
        confirmButtonText: "OK",
        zIndex: 10002,
        customClass: {
          container: "swal2-container-modal",
        },
      });

      // Focus + smooth scroll to the reason field
      setTimeout(() => {
        reasonForDeactivationRef.current?.focus();
        reasonForDeactivationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
      return;
    }

    if (hasUnsavedChanges) {
      const confirmation = await Swal.fire({
        icon: "question",
        title: "Discard changes?",
        text: "You have unsaved changes. Close without saving?",
        showCancelButton: true,
        confirmButtonColor: "#dc3545",
        cancelButtonColor: "var(--primary-color)",
        confirmButtonText: "Discard",
        cancelButtonText: "Continue editing",
        reverseButtons: true,
        zIndex: 10002,
        customClass: {
          container: "swal2-container-modal",
        },
      });
      if (!confirmation.isConfirmed) {
        return;
      }
    }
    await performClose();
  };

  // When toggling to inactive, ensure the reason field is focused AFTER it renders.
  useEffect(() => {
    if (formData.is_active) return;
    // Let the DOM paint the textarea, then scroll/focus.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        reasonForDeactivationRef.current?.focus();
        reasonForDeactivationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      // cleanup raf2 if needed
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [formData.is_active]);

  const handleBackdropClick = async (e) => {
    if (e.target === e.currentTarget) {
      await handleCloseAttempt();
    }
  };

  const handleEscapeKey = async (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      await handleCloseAttempt();
    }
  };

  useEffect(() => {
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [hasUnsavedChanges]);

  return (
    <Portal>
      <style>{`
      `}</style>
      <div
        ref={modalRef}
        className={`modal fade show d-block modal-backdrop-animation ${
          isClosing ? "exit" : ""
        }`}
        onClick={handleBackdropClick}
        tabIndex="-1"
        style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 9999,
        }}
      >
        <div
          className="modal-dialog modal-dialog-centered modal-lg"
          style={{ zIndex: 10000 }}
        >
          <div
            ref={contentRef}
            className={`modal-content border-0 modal-content-animation ${
              isClosing ? "exit" : ""
            }`}
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
              zIndex: 10001,
            }}
          >
            <div
              className="modal-header border-0 text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-color) 0%, var(--primary-dark) 100%)",
              }}
            >
              <h5 className="modal-title fw-bold">
                <i className={`fas ${isEdit ? "fa-edit" : "fa-plus"} me-2`}></i>
                {isEdit ? "Edit Director" : "Add New Director"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleCloseAttempt}
                aria-label="Close"
                disabled={loading}
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                className="modal-body bg-light"
                style={{ maxHeight: "70vh", overflowY: "auto" }}
              >
                <div className="container-fluid px-1">
                  <div className="row gy-4">
                    <div className="col-12">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body text-center p-4">
                          <div className="d-flex flex-column align-items-center">
                            <div
                              className="d-flex align-items-center justify-content-center mb-3"
                              style={{
                                width: 140,
                                height: 140,
                                borderRadius: "50%",
                                border: `4px solid var(--border-color)`,
                                backgroundColor: "var(--background-light)",
                                overflow: "hidden",
                              }}
                            >
                              {avatarPreview ? (
                                <img
                                  src={avatarPreview}
                                  alt="Director avatar preview"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                  onError={(e) => {
                                    console.error(
                                      "Failed to load avatar:",
                                      avatarPreview
                                    );
                                    e.target.style.display = "none";
                                    setAvatarPreview("");
                                  }}
                                />
                              ) : (
                                <span className="text-muted">
                                  <i className="fas fa-user fa-3x" />
                                </span>
                              )}
            </div>
                            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center align-items-center">
                              <label
                                htmlFor="director-avatar-input"
                                className="btn btn-outline-primary btn-sm mb-0"
                                style={{
                                  borderColor: "var(--primary-color)",
                                  color: "var(--primary-color)",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.backgroundColor = "var(--primary-color)";
                                  e.target.style.color = "white";
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.backgroundColor = "transparent";
                                  e.target.style.color = "var(--primary-color)";
                                }}
                              >
                                <i className="fas fa-upload me-2" />
                                {avatarPreview ? "Change Photo" : "Upload Photo"}
                              </label>
                              <input
                                id="director-avatar-input"
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="d-none"
                                onChange={handleAvatarChange}
                                disabled={loading}
                              />
                              {avatarPreview && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={handleAvatarClear}
                                  disabled={loading}
                                  style={{
                                    transition: "all 0.2s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!e.target.disabled) {
                                      e.target.style.backgroundColor = "#dc3545";
                                      e.target.style.color = "white";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = "transparent";
                                    e.target.style.color = "#dc3545";
                                  }}
                                >
                                  <i className="fas fa-trash me-2" />
                                  Remove Photo
                                </button>
                              )}
                            </div>
                            <small className="text-muted mt-2">
                              Recommended: square image up to 2MB (JPG, PNG,
                              GIF, SVG, WebP)
                            </small>
                            {errors.avatar && (
                              <div className="text-danger small mt-2">
                                {errors.avatar}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="card border-0 shadow-sm bg-white mb-3">
                        <div className="card-header bg-light border-bottom">
                          <h6 className="mb-0 fw-semibold" style={{ color: "var(--text-primary)" }}>
                            <i className="fas fa-user-circle me-2" style={{ color: "var(--primary-color)" }}></i>
                            Account Information
                          </h6>
                        </div>
                        <div className="card-body">
                <div className="row g-3">
                            <div className="col-12 col-md-6">
                              <label
                                className="form-label small fw-semibold mb-1"
                                style={{ color: "var(--text-primary)" }}
                              >
                                Username <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.username ? "is-invalid" : ""
                                }`}
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                disabled={loading || directorLoading}
                                placeholder="Unique login username"
                                style={{
                                  backgroundColor: "var(--input-bg)",
                                  borderColor: errors.username
                                    ? "#dc3545"
                                    : "var(--input-border)",
                                  color: "var(--input-text)",
                                }}
                              />
                              {errors.username && (
                                <div className="invalid-feedback">
                                  {errors.username}
                                </div>
                              )}
                              {directorLoading && (
                                <small className="text-muted">
                                  <i className="fas fa-spinner fa-spin me-1"></i>
                                  Checking username availability...
                                </small>
                              )}
                            </div>

                            <div className="col-12 col-md-6">
                              <label
                                className="form-label small fw-semibold mb-1"
                                style={{ color: "var(--text-primary)" }}
                              >
                                Contact Number
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.phone ? "is-invalid" : ""
                                }`}
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                disabled={loading}
                                placeholder="e.g., 0951-341-9336"
                                maxLength={13}
                                style={{
                                  backgroundColor: "var(--input-bg)",
                                  borderColor: errors.phone
                                    ? "#dc3545"
                                    : "var(--input-border)",
                                  color: "var(--input-text)",
                                }}
                              />
                              {errors.phone && (
                                <div className="invalid-feedback">
                                  {errors.phone}
                                </div>
                              )}
                              <small className="text-muted">
                                Enter 11 digits (e.g., 0951-341-9336)
                              </small>
                            </div>
                            <div className="col-12">
                              <label
                                className="form-label small fw-semibold mb-1"
                                style={{ color: "var(--text-primary)" }}
                              >
                                Contact Information
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.contact_information ? "is-invalid" : ""
                                }`}
                                name="contact_information"
                                value={formData.contact_information}
                                onChange={handleChange}
                                disabled={loading}
                                placeholder="Email or other contact details (optional)"
                                style={{
                                  backgroundColor: "var(--input-bg)",
                                  borderColor: errors.contact_information
                                    ? "#dc3545"
                                    : "var(--input-border)",
                                  color: "var(--input-text)",
                                }}
                              />
                              {errors.contact_information && (
                                <div className="invalid-feedback">
                                  {errors.contact_information}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="card border-0 shadow-sm bg-white mb-3">
                        <div className="card-header bg-light border-bottom">
                          <h6 className="mb-0 fw-semibold" style={{ color: "var(--text-primary)" }}>
                            <i className="fas fa-id-card me-2" style={{ color: "var(--primary-color)" }}></i>
                            Personal Information
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-12 col-md-4">
                              <label
                                className="form-label small fw-semibold mb-1"
                                style={{ color: "var(--text-primary)" }}
                              >
                      First Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${
                                  errors.first_name ? "is-invalid" : ""
                      }`}
                                name="first_name"
                      value={formData.first_name}
                                onChange={handleChange}
                                disabled={loading}
                      placeholder="Enter first name"
                                style={{
                                  backgroundColor: "var(--input-bg)",
                                  borderColor: errors.first_name
                                    ? "#dc3545"
                                    : "var(--input-border)",
                                  color: "var(--input-text)",
                                }}
                              />
                              {errors.first_name && (
                                <div className="invalid-feedback">
                                  {errors.first_name}
                      </div>
                    )}
                  </div>

                            <div className="col-12 col-md-4">
                              <label
                                className="form-label small fw-semibold mb-1"
                                style={{ color: "var(--text-primary)" }}
                              >
                                Middle Name
                              </label>
                              <input
                                type="text"
                                className={`form-control ${
                                  errors.middle_name ? "is-invalid" : ""
                                }`}
                                name="middle_name"
                                value={formData.middle_name}
                                onChange={handleChange}
                                disabled={loading}
                                placeholder="Enter middle name (optional)"
                                style={{
                                  backgroundColor: "var(--input-bg)",
                                  borderColor: errors.middle_name
                                    ? "#dc3545"
                                    : "var(--input-border)",
                                  color: "var(--input-text)",
                                }}
                              />
                              {errors.middle_name && (
                                <div className="invalid-feedback">
                                  {errors.middle_name}
                                </div>
                              )}
                            </div>

                            <div className="col-12 col-md-4">
                              <label
                                className="form-label small fw-semibold mb-1"
                                style={{ color: "var(--text-primary)" }}
                              >
                      Last Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${
                                  errors.last_name ? "is-invalid" : ""
                      }`}
                                name="last_name"
                      value={formData.last_name}
                                onChange={handleChange}
                                disabled={loading}
                      placeholder="Enter last name"
                                style={{
                                  backgroundColor: "var(--input-bg)",
                                  borderColor: errors.last_name
                                    ? "#dc3545"
                                    : "var(--input-border)",
                                  color: "var(--input-text)",
                                }}
                              />
                              {errors.last_name && (
                                <div className="invalid-feedback">
                                  {errors.last_name}
                      </div>
                    )}
                  </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="card border-0 shadow-sm bg-white mb-3">
                        <div className="card-header bg-light border-bottom">
                          <h6 className="mb-0 fw-semibold" style={{ color: "var(--text-primary)" }}>
                            <i className="fas fa-building me-2" style={{ color: "var(--primary-color)" }}></i>
                            Employment Information
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <div className="col-12 col-md-6">
                              <label
                                className="form-label small fw-semibold mb-1"
                                style={{ color: "var(--text-primary)" }}
                              >
                                Department <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                                className={`form-control ${
                                  errors.department ? "is-invalid" : ""
                                }`}
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                disabled={loading}
                                placeholder="Enter department"
                                required
                                style={{
                                  backgroundColor: "var(--input-bg)",
                                  borderColor: errors.department
                                    ? "#dc3545"
                                    : "var(--input-border)",
                                  color: "var(--input-text)",
                                }}
                              />
                              {errors.department && (
                                <div className="invalid-feedback">
                                  {errors.department}
                  </div>
                              )}
                            </div>

                            <div className="col-12 col-md-6">
                              <label
                                className="form-label small fw-semibold mb-1"
                                style={{ color: "var(--text-primary)" }}
                              >
                                Position <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${
                                  errors.position ? "is-invalid" : ""
                                }`}
                                name="position"
                                value={formData.position}
                                onChange={handleChange}
                                disabled={loading}
                                placeholder="Enter position"
                                style={{
                                  backgroundColor: "var(--input-bg)",
                                  borderColor: errors.position
                                    ? "#dc3545"
                                    : "var(--input-border)",
                                  color: "var(--input-text)",
                                }}
                              />
                              {errors.position && (
                                <div className="invalid-feedback">
                                  {errors.position}
                      </div>
                    )}
                  </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div className="card border-0 shadow-sm bg-white">
                        <div className="card-body p-3">
                          <div className="form-check form-switch d-flex align-items-center">
                                <input
                                  className="form-check-input me-3"
                                  type="checkbox"
                                  role="switch"
                                  id="is_active_switch"
                                  checked={formData.is_active}
                                  onChange={(e) => {
                                    const newIsActive = e.target.checked;
                                    setFormData((prev) => {
                                      const next = {
                                        ...prev,
                                        is_active: newIsActive,
                                        // Clear reason when activating
                                        reason_for_deactivation: newIsActive ? "" : prev.reason_for_deactivation,
                                      };
                                      setHasUnsavedChanges(
                                        computeHasChanges(
                                          next,
                                          avatarFile,
                                          avatarRemoved
                                        )
                                      );

                                      return next;
                                    });
                                  }}
                                  disabled={loading}
                                  style={{
                                    width: "3rem",
                                    height: "1.5rem",
                                    cursor: loading ? "not-allowed" : "pointer",
                                  }}
                                />
                                <label
                                  className="form-check-label fw-semibold mb-0"
                                  htmlFor="is_active_switch"
                                  style={{
                                    cursor: loading ? "not-allowed" : "pointer",
                                    color: formData.is_active
                                      ? "#28a745"
                                      : "#6c757d",
                                    fontSize: "0.95rem",
                                  }}
                                >
                                  <i
                                    className={`fas me-2 ${
                                      formData.is_active
                                        ? "fa-user-check text-success"
                                        : "fa-user-slash text-secondary"
                                    }`}
                                  ></i>
                                  {formData.is_active
                                    ? "Active Director"
                                    : "Inactive Director"}
                                </label>
                          </div>
                          <small className="text-muted mt-2 d-block">
                            {formData.is_active
                              ? "This director account is active and can access the system."
                              : "This director account is inactive and cannot access the system."}
                          </small>
                          
                          {/* Reason for Deactivation Field */}
                          <AnimatePresence>
                            {!formData.is_active && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: "auto", marginTop: "1rem" }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                style={{ overflow: "hidden" }}
                              >
                                <label
                                  className="form-label small fw-semibold mb-2"
                                  style={{ color: "var(--text-primary)" }}
                                >
                                  Reason for Deactivation{" "}
                        <span className="text-danger">*</span>
                    </label>
                                <textarea
                                  ref={reasonForDeactivationRef}
                      className={`form-control ${
                                    errors.reason_for_deactivation ? "is-invalid" : ""
                                  }`}
                                  name="reason_for_deactivation"
                                  value={formData.reason_for_deactivation}
                                  onChange={handleChange}
                                  disabled={loading}
                                  placeholder="Enter the reason for deactivation (this will be shown to the director when they try to login)"
                                  rows={3}
                                  style={{
                                    backgroundColor: "var(--input-bg)",
                                    borderColor: errors.reason_for_deactivation
                                      ? "#dc3545"
                                      : "var(--input-border)",
                                    color: "var(--input-text)",
                                    resize: "vertical",
                                  }}
                                />
                                {errors.reason_for_deactivation && (
                                  <div className="invalid-feedback">
                                    {errors.reason_for_deactivation}
                      </div>
                    )}
                                <small className="text-muted mt-1 d-block">
                                  <i className="fas fa-info-circle me-1"></i>
                                  This reason will be displayed to the director when they attempt to login.
                                </small>
                              </motion.div>
                            )}
                          </AnimatePresence>
                  </div>
                      </div>
                    </div>

                    <div className="col-12">
                      <div
                        className="card bg-white"
                        style={{
                          border: `2px solid var(--accent-color)`,
                        }}
                      >
                        <div
                          className="card-header"
                          style={{
                            backgroundColor: "rgba(255, 179, 0, 0.1)",
                            borderBottom: `1px solid var(--accent-color)`,
                          }}
                        >
                          <h6
                            className="mb-0"
                            style={{ color: "var(--accent-color)" }}
                          >
                            <i className="fas fa-key me-2"></i>
                            {isEdit
                              ? "Update Password (Optional)"
                              : "Password Information"}
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                  <div className="col-md-6">
                                  <div className="mb-2 position-relative">
                                    <label
                                      className="form-label"
                                      style={{
                                        fontSize: "0.9rem",
                                        color: "var(--text-primary)",
                                        fontWeight: 500,
                                        marginBottom: "0.5rem",
                                      }}
                                    >
                                      Password {isEdit ? "" : "*"}
                    </label>
                                    <div className="position-relative">
                    <input
                                        type={showPassword ? "text" : "password"}
                                        className={`form-control ${
                                          formData.password &&
                                          passwordValidation.minLength &&
                                          passwordValidation.hasLetter &&
                                          passwordValidation.hasNumber
                                            ? "is-valid"
                                            : formData.password &&
                                              !(
                                                passwordValidation.minLength &&
                                                passwordValidation.hasLetter &&
                                                passwordValidation.hasNumber
                                              )
                                            ? "is-invalid"
                                            : ""
                                        }`}
                                        placeholder={
                                          isEdit
                                            ? "Leave blank to keep current password"
                                            : "••••••••"
                                        }
                                        value={formData.password}
                                        onChange={handleChange}
                                        name="password"
                                        disabled={loading}
                                        style={{
                                          fontSize: "0.95rem",
                                          paddingRight:
                                            formData.password &&
                                            passwordValidation.minLength &&
                                            passwordValidation.hasLetter &&
                                            passwordValidation.hasNumber
                                              ? "70px"
                                              : formData.password &&
                                                !(
                                                  passwordValidation.minLength &&
                                                  passwordValidation.hasLetter &&
                                                  passwordValidation.hasNumber
                                                )
                                              ? "70px"
                                              : "40px",
                                        }}
                                        required={!isEdit}
                                      />
                                      <button
                                        type="button"
                                        className="btn p-0 position-absolute"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setShowPassword(!showPassword);
                                        }}
                                        style={{
                                          right:
                                            formData.password &&
                                            passwordValidation.minLength &&
                                            passwordValidation.hasLetter &&
                                            passwordValidation.hasNumber
                                              ? "38px"
                                              : formData.password &&
                                                !(
                                                  passwordValidation.minLength &&
                                                  passwordValidation.hasLetter &&
                                                  passwordValidation.hasNumber
                                                )
                                              ? "38px"
                                              : "8px",
                                          top: "0",
                                          bottom: "0",
                                          height: "auto",
                                          width: "32px",
                                          border: "none",
                                          backgroundColor: "transparent",
                                          color: "#666",
                                          cursor: "pointer",
                                          transition: "all 0.2s ease",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          padding: 0,
                                          margin: 0,
                                          zIndex: 10,
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.color = "#000";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.color = "#666";
                                        }}
                                      >
                                        {showPassword ? (
                                          <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ display: "block" }}
                                          >
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                          </svg>
                                        ) : (
                                          <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            style={{ display: "block" }}
                                          >
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                            <line x1="1" y1="1" x2="23" y2="23"></line>
                                          </svg>
                                        )}
                                      </button>
                  </div>
                                    {/* Password validation criteria */}
                                    <AnimatePresence>
                                      {formData.password && (
                                        <motion.div
                                          key="validation-criteria"
                                          initial={{
                                            opacity: 0,
                                            y: -10,
                                            height: 0,
                                          }}
                                          animate={{
                                            opacity: 1,
                                            y: 0,
                                            height: "auto",
                                          }}
                                          exit={{
                                            opacity: 0,
                                            y: -10,
                                            height: 0,
                                          }}
                                          transition={{
                                            duration: 0.3,
                                            ease: "easeOut",
                                          }}
                                          style={{
                                            marginTop: "0.5rem",
                                            fontSize: "0.85rem",
                                            overflow: "hidden",
                                          }}
                                        >
                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{
                                              duration: 0.25,
                                              delay: 0.05,
                                              ease: "easeOut",
                                            }}
                                            style={{
                                              color: passwordValidation.minLength
                                                ? "#28a745"
                                                : "#dc3545",
                                              marginBottom: "0.25rem",
                                              transition: "color 0.3s ease",
                                            }}
                                          >
                                            8 characters minimum
                                          </motion.div>
                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{
                                              duration: 0.25,
                                              delay: 0.1,
                                              ease: "easeOut",
                                            }}
                                            style={{
                                              color: passwordValidation.hasLetter
                                                ? "#28a745"
                                                : "#dc3545",
                                              marginBottom: "0.25rem",
                                              transition: "color 0.3s ease",
                                            }}
                                          >
                                            At least one letter
                                          </motion.div>
                                          <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{
                                              duration: 0.25,
                                              delay: 0.15,
                                              ease: "easeOut",
                                            }}
                                            style={{
                                              color: passwordValidation.hasNumber
                                                ? "#28a745"
                                                : "#dc3545",
                                              transition: "color 0.3s ease",
                                            }}
                                          >
                                            At least one number
                                          </motion.div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                    {errors.password && !formData.password && (
                                      <div className="invalid-feedback d-block">
                                        {errors.password}
                                      </div>
                                    )}
                                  </div>
                            </div>

                  <div className="col-md-6">
                              <div className="mb-3 position-relative">
                                    <label
                                      className="form-label small fw-semibold mb-1"
                                      style={{ color: "var(--text-primary)" }}
                                    >
                                      Confirm Password
                    </label>
                                    <div className="input-group">
                                      <span
                                        className={`input-group-text bg-white border-end-0 ${
                                          errors.password_confirmation
                                            ? "border-danger"
                                            : ""
                                        }`}
                                      >
                                        <i className="fas fa-lock"></i>
                                      </span>
                    <input
                                        type={
                                          showConfirmPassword ? "text" : "password"
                                        }
                                        className={`form-control border-start-0 ps-2 ${
                                          errors.password_confirmation
                                            ? "is-invalid"
                                            : ""
                                        }`}
                                        name="password_confirmation"
                                        value={formData.password_confirmation}
                                        onChange={handleChange}
                                        disabled={loading}
                                        placeholder="Confirm password"
                                      />
                                      <span
                                        className={`input-group-text bg-white border-start-0 ${
                                          errors.password_confirmation
                                            ? "border-danger"
                                            : ""
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          className="btn btn-sm p-0 border-0 bg-transparent text-muted"
                                          onClick={() =>
                                            setShowConfirmPassword(
                                              !showConfirmPassword
                                            )
                                          }
                                          disabled={loading}
                                        >
                                          <i
                                            className={`fas ${
                                              showConfirmPassword
                                                ? "fa-eye-slash"
                                                : "fa-eye"
                                            }`}
                                          ></i>
                                        </button>
                                      </span>
                  </div>
                                    {errors.password_confirmation && (
                                      <div className="invalid-feedback d-block">
                                        {errors.password_confirmation}
                </div>
                                    )}
              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-top bg-white modal-smooth">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-smooth"
                  onClick={handleCloseAttempt}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-smooth"
                  style={{
                    backgroundColor: "var(--primary-color)",
                    borderColor: "var(--primary-color)",
                  }}
                  disabled={loading || directorLoading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-1"></i>
                      {isEdit ? "Update Director" : "Create Director"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DirectorFormModal;
