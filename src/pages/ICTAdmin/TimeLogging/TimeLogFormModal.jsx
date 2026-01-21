import React, { useEffect, useMemo, useRef, useState } from "react";
import Portal from "../../../components/Portal";
import { showAlert } from "../../../services/notificationService";

const DEFAULT_FORM = {
  personnel_id: "",
  log_date: "",
  time_in: "",
  time_out: "",
  remarks: "",
};

const TimeLogFormModal = ({
  editingLog,
  onSubmit,
  onClose,
  actionLock,
}) => {
  const token = useMemo(() => localStorage.getItem("token"), []);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [personnelOptions, setPersonnelOptions] = useState([]);
  const [personnelLoading, setPersonnelLoading] = useState(true);
  const initialStateRef = useRef(DEFAULT_FORM);

  const isEdit = !!editingLog;

  useEffect(() => {
    if (editingLog) {
      const nextState = {
        personnel_id: editingLog.personnel_id || editingLog.personnel?.id || "",
        log_date: editingLog.log_date || "",
        time_in: editingLog.time_in?.slice(0, 5) || "",
        time_out: editingLog.time_out ? editingLog.time_out.slice(0, 5) : "",
        remarks: editingLog.remarks || "",
      };
      setFormData(nextState);
      initialStateRef.current = nextState;
    } else {
      setFormData(DEFAULT_FORM);
      initialStateRef.current = DEFAULT_FORM;
    }
    setErrors({});
  }, [editingLog]);

  useEffect(() => {
    const fetchPersonnel = async () => {
      if (!token) {
        setPersonnelOptions([]);
        setPersonnelLoading(false);
        return;
      }
      setPersonnelLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"}/ict-admin/personnel?per_page=1000`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );
        const data = await response.json();
        const items = data?.data?.items || [];
        setPersonnelOptions(items);
      } catch (error) {
        setPersonnelOptions([]);
      } finally {
        setPersonnelLoading(false);
      }
    };

    fetchPersonnel();
  }, [token]);

  const validateForm = () => {
    const nextErrors = {};
    if (!formData.personnel_id) {
      nextErrors.personnel_id = "Personnel is required";
    }
    if (!formData.log_date) {
      nextErrors.log_date = "Log date is required";
    }
    if (!formData.time_in) {
      nextErrors.time_in = "Time in is required";
    }
    if (formData.time_out && formData.time_in && formData.time_out < formData.time_in) {
      nextErrors.time_out = "Time out must be after time in";
    }
    if (formData.remarks && formData.remarks.length > 1000) {
      nextErrors.remarks = "Remarks must not exceed 1000 characters";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (actionLock || loading) return;

    if (!validateForm()) {
      await showAlert.error(
        "Validation Error",
        "Please correct the highlighted fields before saving.",
        { zIndex: 10002, customClass: { container: "swal2-container-modal" } }
      );
      return;
    }

    const confirm = await showAlert.confirm(
      isEdit ? "Update Time Log" : "Create Time Log",
      isEdit
        ? "Save changes to this time log?"
        : "Create a new time log entry?",
      "Save",
      "Cancel"
    );
    if (!confirm.isConfirmed) return;

    try {
      setLoading(true);
      const payload = new FormData();
      payload.append("personnel_id", formData.personnel_id);
      payload.append("log_date", formData.log_date);
      payload.append("time_in", formData.time_in);
      payload.append("time_out", formData.time_out || "");
      payload.append("remarks", formData.remarks || "");
      if (isEdit) {
        payload.append("_method", "PUT");
      }

      const response = await fetch(
        `${import.meta.env.VITE_LARAVEL_API || "http://localhost:8000/api"}/ict-admin/time-logs${isEdit ? `/${editingLog.id}` : ""}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: payload,
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success) {
        const message = data.message || "Unable to save time log.";
        throw new Error(message);
      }

      await showAlert.success(
        "Success",
        isEdit ? "Time log updated successfully." : "Time log created successfully.",
        { zIndex: 10002, customClass: { container: "swal2-container-modal" } }
      );

      onSubmit?.(data.data);
    } catch (error) {
      showAlert.error(
        "Save Failed",
        error.message || "Unable to save time log. Please try again.",
        { zIndex: 10002, customClass: { container: "swal2-container-modal" } }
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    const hasChanges =
      JSON.stringify(formData) !== JSON.stringify(initialStateRef.current);

    if (hasChanges && !loading) {
      const confirm = await showAlert.confirm(
        "Unsaved Changes",
        "You have unsaved changes. Are you sure you want to close?",
        "Yes, close",
        "Cancel"
      );
      if (!confirm.isConfirmed) return;
    }

    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <Portal>
      <div
        className={`modal fade show d-block modal-backdrop-animation ${
          isClosing ? "exit" : ""
        }`}
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        <div
          className={`modal-dialog modal-lg modal-dialog-centered modal-content-animation ${
            isClosing ? "exit" : ""
          }`}
        >
          <div className="modal-content">
            <div
              className="modal-header border-0"
              style={{
                background: "var(--primary-color)",
                color: "white",
              }}
            >
              <h5 className="modal-title fw-bold">
                <i className="fas fa-clock me-2"></i>
                {isEdit ? "Update Time Log" : "Add Time Log"}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleClose}
                disabled={loading}
              ></button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="card border-0 shadow-sm bg-white mb-3">
                  <div className="card-header bg-light border-bottom">
                    <h6 className="mb-0 fw-semibold" style={{ color: "var(--text-primary)" }}>
                      <i className="fas fa-user me-2" style={{ color: "var(--primary-color)" }}></i>
                      Personnel & Date
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold mb-1">
                          Personnel <span className="text-danger">*</span>
                        </label>
                        <select
                          className={`form-select ${errors.personnel_id ? "is-invalid" : ""}`}
                          name="personnel_id"
                          value={formData.personnel_id}
                          onChange={handleChange}
                          disabled={loading || personnelLoading}
                          style={{
                            backgroundColor: "var(--input-bg)",
                            borderColor: errors.personnel_id
                              ? "#dc3545"
                              : "var(--input-border)",
                            color: "var(--input-text)",
                          }}
                        >
                          <option value="">Select personnel</option>
                          {personnelOptions.map((person) => (
                            <option key={person.id} value={person.id}>
                              {person.first_name}{" "}
                              {person.middle_name ? `${person.middle_name} ` : ""}
                              {person.last_name} (@{person.username})
                            </option>
                          ))}
                        </select>
                        {errors.personnel_id && (
                          <div className="invalid-feedback">
                            {errors.personnel_id}
                          </div>
                        )}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold mb-1">
                          Log Date <span className="text-danger">*</span>
                        </label>
                        <input
                          type="date"
                          className={`form-control ${errors.log_date ? "is-invalid" : ""}`}
                          name="log_date"
                          value={formData.log_date}
                          onChange={handleChange}
                          disabled={loading}
                          style={{
                            backgroundColor: "var(--input-bg)",
                            borderColor: errors.log_date
                              ? "#dc3545"
                              : "var(--input-border)",
                            color: "var(--input-text)",
                          }}
                        />
                        {errors.log_date && (
                          <div className="invalid-feedback">
                            {errors.log_date}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card border-0 shadow-sm bg-white mb-3">
                  <div className="card-header bg-light border-bottom">
                    <h6 className="mb-0 fw-semibold" style={{ color: "var(--text-primary)" }}>
                      <i className="fas fa-stopwatch me-2" style={{ color: "var(--primary-color)" }}></i>
                      Time Details
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold mb-1">
                          Time In <span className="text-danger">*</span>
                        </label>
                        <input
                          type="time"
                          className={`form-control ${errors.time_in ? "is-invalid" : ""}`}
                          name="time_in"
                          value={formData.time_in}
                          onChange={handleChange}
                          disabled={loading}
                          style={{
                            backgroundColor: "var(--input-bg)",
                            borderColor: errors.time_in
                              ? "#dc3545"
                              : "var(--input-border)",
                            color: "var(--input-text)",
                          }}
                        />
                        {errors.time_in && (
                          <div className="invalid-feedback">
                            {errors.time_in}
                          </div>
                        )}
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label small fw-semibold mb-1">
                          Time Out
                        </label>
                        <input
                          type="time"
                          className={`form-control ${errors.time_out ? "is-invalid" : ""}`}
                          name="time_out"
                          value={formData.time_out}
                          onChange={handleChange}
                          disabled={loading}
                          style={{
                            backgroundColor: "var(--input-bg)",
                            borderColor: errors.time_out
                              ? "#dc3545"
                              : "var(--input-border)",
                            color: "var(--input-text)",
                          }}
                        />
                        {errors.time_out && (
                          <div className="invalid-feedback">
                            {errors.time_out}
                          </div>
                        )}
                      </div>
                      <div className="col-12">
                        <label className="form-label small fw-semibold mb-1">
                          Remarks
                        </label>
                        <textarea
                          className={`form-control ${errors.remarks ? "is-invalid" : ""}`}
                          name="remarks"
                          value={formData.remarks}
                          onChange={handleChange}
                          disabled={loading}
                          rows={3}
                          placeholder="Optional notes about this time log"
                          style={{
                            backgroundColor: "var(--input-bg)",
                            borderColor: errors.remarks
                              ? "#dc3545"
                              : "var(--input-border)",
                            color: "var(--input-text)",
                          }}
                        ></textarea>
                        {errors.remarks && (
                          <div className="invalid-feedback">
                            {errors.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer border-0">
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>
                      {isEdit ? "Update Log" : "Create Log"}
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

export default TimeLogFormModal;

