import { useId, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { api, ApiError } from "../lib/api.js";
import { useSeo } from "../hooks.js";
import { SITE, seo, services } from "../data.js";
import { Icon, IconBadge } from "../components/Icons.jsx";

const EMPTY = { name: "", email: "", phone: "", service: "", message: "", company: "" };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The same rules as the server, so people see mistakes before sending. The server checks again. */
function validate(values) {
  const errors = {};
  if (values.name.trim().length < 2) errors.name = "Please enter your name.";
  if (!EMAIL.test(values.email.trim())) errors.email = "Please enter a valid email address.";
  if (!/^\+?\d{7,15}$/.test(values.phone.replace(/[\s().-]/g, ""))) errors.phone = "Please enter a valid contact number.";
  if (!values.service) errors.service = "Please choose what you are inquiring about.";
  if (values.message.trim().length < 10) errors.message = "Please write at least a few words (10 characters).";
  return errors;
}

function Field({ id, label, error, children }) {
  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function Contact() {
  useSeo({ ...seo["/contact"], path: "/contact" });
  const uid = useId();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState("idle"); // idle | sending | sent | failed
  const [failure, setFailure] = useState("");

  const id = (name) => `${uid}-${name}`;
  const update = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };
  const props = (name) => ({
    id: id(name),
    value: values[name],
    onChange: update(name),
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${id(name)}-error` : undefined,
  });

  const onSubmit = async (event) => {
    event.preventDefault();
    if (state === "sending") return;
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) {
      document.getElementById(id(Object.keys(found)[0]))?.focus();
      return;
    }

    setState("sending");
    setFailure("");
    try {
      await api("/api/inquiries", { method: "POST", body: values });
      setState("sent");
      setValues(EMPTY);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422 && error.data.errors) {
        setErrors(error.data.errors);
        setState("idle");
        return;
      }
      setFailure(
        error instanceof ApiError && error.status === 429
          ? "Too many inquiries from this connection. Please try again later."
          : `Something went wrong. Please try again, or email ${SITE.email}.`
      );
      setState("failed");
    }
  };

  return (
    <>
      <section className="page-hero">
        <div className="container">
          <motion.p className="eyebrow" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <Icon name="terminal" size={16} animated={false} /> Contact
          </motion.p>
          <h1 className="page-title">Let&rsquo;s talk.</h1>
          <p className="lead">
            Tell me what you want to build or secure. I read every inquiry and reply by email or phone.
          </p>
        </div>
      </section>

      <section className="section contact-section">
        <div className="container contact-grid">
          <motion.div
            className="contact-card"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <AnimatePresence mode="wait">
              {state === "sent" ? (
                <motion.div
                  key="sent"
                  className="form-success"
                  role="status"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                >
                  <span className="success-badge">
                    <Icon name="check" size={36} strokeWidth={2.4} />
                  </span>
                  <h2>Inquiry sent</h2>
                  <p>Thank you. I will get back to you soon by email or phone.</p>
                  <button type="button" className="btn btn-ghost" onClick={() => setState("idle")}>
                    Send another
                  </button>
                </motion.div>
              ) : (
                <motion.form key="form" className="form" noValidate onSubmit={onSubmit} exit={{ opacity: 0 }}>
                  <div className="form-row">
                    <Field id={id("name")} label="Your name" error={errors.name}>
                      <input type="text" name="name" autoComplete="name" placeholder="Full name" maxLength={100} {...props("name")} />
                    </Field>
                    <Field id={id("email")} label="Email" error={errors.email}>
                      <input type="email" name="email" autoComplete="email" inputMode="email" placeholder="you@example.com" maxLength={150} {...props("email")} />
                    </Field>
                  </div>

                  <div className="form-row">
                    <Field id={id("phone")} label="Contact number" error={errors.phone}>
                      <input type="tel" name="phone" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" maxLength={30} {...props("phone")} />
                    </Field>
                    <Field id={id("service")} label="Inquiring about" error={errors.service}>
                      <select name="service" {...props("service")}>
                        <option value="" disabled>
                          Choose a service
                        </option>
                        {services.map((service) => (
                          <option key={service.value} value={service.value}>
                            {service.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <Field id={id("message")} label="Message" error={errors.message}>
                    <textarea name="message" rows={6} placeholder="Tell me about your project or what you need tested." maxLength={2000} {...props("message")} />
                  </Field>

                  {/* Honeypot: people never see this field, bots fill it in. */}
                  <div className="hp" aria-hidden="true">
                    <label htmlFor={id("company")}>Company</label>
                    <input type="text" id={id("company")} name="company" tabIndex={-1} autoComplete="off" value={values.company} onChange={update("company")} />
                  </div>

                  {state === "failed" && (
                    <p className="form-alert" role="alert">
                      <Icon name="alert" size={18} animated={false} /> {failure}
                    </p>
                  )}

                  <button type="submit" className="btn btn-primary form-submit" disabled={state === "sending"}>
                    {state === "sending" ? "Sending…" : "Send inquiry"}
                    <Icon name="send" size={18} animated={false} />
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.aside
            className="contact-side"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.15 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <h2>Prefer to reach out directly?</h2>
            <ul className="side-list">
              <li>
                <IconBadge name="mail" size={22} />
                <div>
                  <span>Email</span>
                  <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                </div>
              </li>
              <li>
                <IconBadge name="phone" size={22} />
                <div>
                  <span>Phone</span>
                  <a href={SITE.phoneHref}>{SITE.phone}</a>
                </div>
              </li>
              <li>
                <IconBadge name="pin" size={22} />
                <div>
                  <span>Based in</span>
                  <strong>{SITE.location}</strong>
                </div>
              </li>
            </ul>
            <p className="side-note">
              <Icon name="lock" size={16} animated={false} /> Your details are used only to reply to your inquiry.
            </p>
          </motion.aside>
        </div>
      </section>
    </>
  );
}
