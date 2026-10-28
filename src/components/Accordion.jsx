import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icons.jsx";

// A deliberately springy accordion: low damping lets the panel overshoot and settle.

const BOUNCE = { type: "spring", stiffness: 260, damping: 13, mass: 0.9 };

function Item({ item, index, open, onToggle }) {
  const buttonId = `faq-button-${index}`;
  const panelId = `faq-panel-${index}`;

  return (
    <motion.div
      className="faq-item"
      data-open={open}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.3 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
    >
      <h3 className="faq-heading">
        <motion.button
          type="button"
          id={buttonId}
          className="faq-question"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          whileTap={{ scale: 0.97 }}
          transition={BOUNCE}
        >
          <span>{item.q}</span>
          <motion.span
            className="faq-plus"
            animate={{ rotate: open ? 135 : 0, scale: open ? [1, 1.35, 1] : 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 11 }}
          >
            <Icon name="plus" size={20} animated={false} />
          </motion.span>
        </motion.button>
      </h3>

      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!open}
        className="faq-panel"
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={BOUNCE}
      >
        <motion.p
          className="faq-answer"
          initial={false}
          animate={{ y: open ? 0 : -14 }}
          transition={{ ...BOUNCE, delay: open ? 0.05 : 0 }}
        >
          {item.a}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

export default function Accordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="faq">
      {items.map((item, index) => (
        <Item
          key={item.q}
          item={item}
          index={index}
          open={openIndex === index}
          onToggle={() => setOpenIndex(openIndex === index ? -1 : index)}
        />
      ))}
    </div>
  );
}
