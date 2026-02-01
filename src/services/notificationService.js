import Swal from "sweetalert2";

export const showAlert = {
  success: (title, text) => {
    return Swal.fire({
      icon: "success",
      title: title,
      text: text,
      confirmButtonColor: "#0C8A3B",
      confirmButtonText: "OK",
    });
  },

  error: (title, text) => {
    return Swal.fire({
      icon: "error",
      title: title,
      text: text,
      confirmButtonColor: "#dc3545",
      confirmButtonText: "OK",
      width: "400px",
      padding: "1.5rem",
      customClass: {
        popup: "small-alert",
        title: "small-alert-title",
        htmlContainer: "small-alert-content",
      },
    });
  },

  warning: (title, text) => {
    return Swal.fire({
      icon: "warning",
      title: title,
      text: text,
      confirmButtonColor: "#F8C202",
      confirmButtonText: "OK",
    });
  },

  info: (title, text) => {
    return Swal.fire({
      icon: "info",
      title: title,
      text: text,
      confirmButtonColor: "#0C8A3B",
      confirmButtonText: "OK",
    });
  },

  confirm: (title, text, confirmText = "Yes", cancelText = "Cancel") => {
    return Swal.fire({
      icon: "question",
      title: title,
      text: text,
      showCancelButton: true,
      confirmButtonColor: "#0C8A3B",
      cancelButtonColor: "#6c757d",
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    });
  },

  loading: (title, targetSelector) => {
    return Swal.fire({
      title: title,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      // Render inside target to avoid covering the whole app (keeps login visible)
      target: targetSelector || document.body,
      // No backdrop so the page stays visible
      backdrop: false,
      width: 360,
      padding: "1rem",
      background: "#ffffff",
      customClass: {
        popup: "da-swal-loading",
        container: "swal2-container-loading",
      },
      didOpen: () => {
        Swal.showLoading();
      },
    });
  },

  close: () => {
    Swal.close();
  },
};

export const showToast = {
  success: (message) => {
    return Swal.fire({
      icon: "success",
      title: message,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
    });
  },

  error: (message) => {
    return Swal.fire({
      icon: "error",
      title: message,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
    });
  },

  warning: (message) => {
    return Swal.fire({
      icon: "warning",
      title: message,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
    });
  },

  info: (message) => {
    return Swal.fire({
      icon: "info",
      title: message,
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener("mouseenter", Swal.stopTimer);
        toast.addEventListener("mouseleave", Swal.resumeTimer);
      },
    });
  },
};
