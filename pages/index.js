import React, { useEffect, useState } from "react";
import Script from "next/script";
import getConstants from "../constants";
import examConfigs from "../examConfig";
import { useRouter } from "next/router";
import Head from "next/head";
import TneaScoreCalculator from "../components/TneaScoreCalculator";
import {
  Check,
  CircleDot,
  Flag,
  GraduationCap,
  ListChecks,
  MapPin,
  School,
  Users,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

const defaultPrimaryInputConfig = {
  label: "Enter Rank",
  placeholder: "Enter your rank",
  step: "1",
  min: "0",
  allowDecimal: false,
};

const getPrimaryInputConfig = (exam) =>
  examConfigs[exam]?.primaryInput || defaultPrimaryInputConfig;

const validatePrimaryInputValue = (exam, value) => {
  if (value === "") return "";
  const inputConfig = getPrimaryInputConfig(exam);
  const numericValue = Number(value);
  const rangeMessage =
    inputConfig.max !== undefined
      ? `Please enter a value between ${inputConfig.min} and ${inputConfig.max}.`
      : `Please enter a value greater than or equal to ${inputConfig.min}.`;
  if (Number.isNaN(numericValue)) return "Please enter a valid value.";
  if (inputConfig.min !== undefined && numericValue < Number(inputConfig.min))
    return rangeMessage;
  if (inputConfig.max !== undefined && numericValue > Number(inputConfig.max))
    return rangeMessage;
  return "";
};

const normalizePrimaryInputValue = (exam, value) => {
  if (value === "") return "";
  const inputConfig = getPrimaryInputConfig(exam);
  if (inputConfig.allowDecimal) return value;
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) return "";
  return String(Math.floor(numericValue));
};

const getCleanQueryEntries = (data) =>
  Object.entries(data).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );

// ─── sub-components ───────────────────────────────────────────────────────────

/** Glowing dot indicator */
const StepBadge = ({ index, isActive, isDone }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 28,
      height: 28,
      borderRadius: "50%",
      flexShrink: 0,
      fontSize: 12,
      fontWeight: 700,
      fontFamily: "'Sora', sans-serif",
      transition: "all 0.25s ease",
      background: isDone
        ? "var(--brand)"
        : isActive
        ? "var(--bg-soft)"
        : "var(--surface)",
      color: isDone ? "var(--brand-contrast)" : isActive ? "var(--text)" : "var(--text-muted)",
      border: isDone
        ? "none"
        : "1.5px solid var(--stroke)",
      boxShadow: isDone
        ? "0 1px 2px rgba(15,23,42,0.06)"
        : isActive
        ? "0 1px 2px rgba(15,23,42,0.06)"
        : "none",
    }}
  >
    {isDone ? <Check size={13} /> : index + 1}
  </span>
);

/** Segment toggle (2 options) */
const SegmentToggle = ({ name, options, formData, onChange }) => (
  <div
    style={{
      display: "inline-flex",
      width: "100%",
      borderRadius: 14,
      overflow: "hidden",
      border: "1.5px solid var(--stroke)",
      background: "var(--surface)",
    }}
  >
    {options.map((opt) => {
      const sel = formData[name] === opt.label;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            flex: 1,
            padding: "11px 16px",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Sora', sans-serif",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
            background: sel ? "var(--brand)" : "transparent",
            color: sel ? "var(--brand-contrast)" : "var(--text-muted)",
            letterSpacing: "0.01em",
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

/** Chip pill selector */
const ChipSelector = ({ name, options, formData, onChange }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
    {options.map((opt) => {
      const sel = formData[name] === opt.label;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: "9px 18px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'Sora', sans-serif",
            cursor: "pointer",
            transition: "all 0.2s ease",
            border: sel ? "1.5px solid var(--brand)" : "1.5px solid var(--stroke)",
            background: sel ? "var(--accent-soft)" : "var(--surface)",
            color: sel ? "var(--brand)" : "var(--text-muted)",
            boxShadow: sel ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
            transform: sel ? "translateY(-1px)" : "none",
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

/** Card grid selector with icon */
const getOptionIcon = (label) => {
  const v = String(label).toLowerCase();
  if (v.includes("state") || v.includes("delhi")) return MapPin;
  if (v.includes("engineering") || v.includes("architecture")) return School;
  if (v.includes("female") || v.includes("gender")) return Users;
  if (v.includes("yes") || v.includes("no")) return ListChecks;
  if (v.includes("open") || v.includes("ews") || v.includes("obc")) return Flag;
  return GraduationCap;
};

const CardSelector = ({ name, options, formData, onChange }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))",
      gap: 12,
    }}
  >
    {options.map((opt) => {
      const sel = formData[name] === opt.label;
      const Icon = getOptionIcon(opt.label);
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: "14px 14px 12px",
            borderRadius: 14,
            textAlign: "left",
            cursor: "pointer",
            transition: "all 0.2s ease",
            border: sel
              ? "1.5px solid var(--brand)"
              : "1.5px solid var(--stroke)",
            background: sel ? "var(--accent-soft)" : "var(--surface)",
            color: sel ? "var(--brand)" : "var(--text-muted)",
            boxShadow: sel ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
            transform: sel ? "translateY(-2px)" : "none",
          }}
        >
          <Icon size={17} style={{ marginBottom: 8 }} />
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "'Sora', sans-serif",
              color: sel ? "var(--brand)" : "var(--text)",
              lineHeight: 1.3,
            }}
          >
            {opt.label}
          </p>
        </button>
      );
    })}
  </div>
);

/** Searchable list selector */
const SearchableSelector = ({ name, options, formData, onChange, search, onSearchChange }) => {
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase().trim())
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search options…"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "11px 16px 11px 40px",
            borderRadius: 12,
            border: "1.5px solid var(--stroke)",
            background: "var(--surface)",
            color: "var(--text)",
            fontSize: 14,
            outline: "none",
            fontFamily: "'Manrope', sans-serif",
          }}
        />
        <span
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 15,
            opacity: 0.4,
          }}
        >
          🔍
        </span>
      </div>
      <div
        style={{
          maxHeight: 240,
          overflowY: "auto",
          borderRadius: 12,
          border: "1.5px solid var(--stroke)",
          padding: 8,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
        }}
      >
        {filtered.map((opt) => {
          const sel = formData[name] === opt.label;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                border: sel
                  ? "1.5px solid var(--brand)"
                  : "1.5px solid var(--stroke)",
                background: sel
                  ? "var(--accent-soft)"
                  : "var(--surface)",
                color: sel ? "var(--brand)" : "var(--text-muted)",
                transition: "all 0.15s ease",
                textAlign: "left",
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {sel ? (
                <Check size={12} style={{ flexShrink: 0 }} />
              ) : (
                <CircleDot size={12} style={{ flexShrink: 0, opacity: 0.4 }} />
              )}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/** Exam card grid selector */
const ExamSelector = ({ examOptions, selectedExam, onSelect }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
      gap: 12,
    }}
  >
    {examOptions.map((opt) => {
      const sel = selectedExam === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt)}
          style={{
            padding: "16px 16px 14px",
            borderRadius: 16,
            textAlign: "left",
            cursor: "pointer",
            transition: "all 0.2s ease",
            border: sel ? "1.5px solid var(--brand)" : "1.5px solid var(--stroke)",
            background: sel ? "var(--accent-soft)" : "var(--surface)",
            boxShadow: sel ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
            transform: sel ? "translateY(-2px)" : "none",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 10,
              marginBottom: 10,
              background: sel
                ? "var(--brand)"
                : "var(--bg-soft)",
              boxShadow: sel ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
            }}
          >
            <GraduationCap size={16} color={sel ? "var(--brand-contrast)" : "var(--text-muted)"} />
          </div>
          <p
            style={{
              margin: "0 0 4px",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Sora', sans-serif",
              color: sel ? "var(--brand)" : "var(--text)",
            }}
          >
            {opt.label}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", fontFamily: "'Manrope',sans-serif" }}>
            Counselling flow
          </p>
        </button>
      );
    })}
  </div>
);

// ─── mode toggle ──────────────────────────────────────────────────────────────

const ModeToggle = ({ value, onChange, options }) => (
  <div
    style={{
      display: "inline-flex",
      width: "100%",
      borderRadius: 14,
      overflow: "hidden",
      border: "1.5px solid var(--stroke)",
      background: "var(--surface)",
    }}
  >
    {options.map((opt) => {
      const sel = value === opt.value;
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1,
            padding: "11px 16px",
            fontSize: 14,
            fontWeight: 700,
            fontFamily: "'Sora', sans-serif",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
            background: sel ? "#f5f1e3" : "transparent",
            color: sel ? "var(--text)" : "var(--text-muted)",
          }}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);

// ─── pill review chip ─────────────────────────────────────────────────────────

const ReviewChip = ({ label, value }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 13px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      fontFamily: "'Manrope', sans-serif",
      background: "var(--bg-soft)",
      border: "1px solid #dbe3ed",
      color: "var(--text-muted)",
    }}
  >
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{label}:</span>
    {String(value)}
  </span>
);

// ─── text input ───────────────────────────────────────────────────────────────

const ModernInput = ({ error, ...props }) => (
  <input
    {...props}
    style={{
      width: "100%",
      boxSizing: "border-box",
      padding: "13px 16px",
      borderRadius: 14,
      border: error
        ? "1.5px solid #ef4444"
        : "1.5px solid var(--stroke)",
      background: "var(--surface)",
      color: "var(--text)",
      fontSize: 15,
      fontFamily: "'Manrope', sans-serif",
      outline: "none",
      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    }}
    onFocus={(e) => {
      e.target.style.borderColor = "var(--brand)";
      e.target.style.boxShadow = "0 0 0 3px rgba(182,58,48,0.14)";
    }}
    onBlur={(e) => {
      e.target.style.borderColor = error ? "#ef4444" : "var(--stroke)";
      e.target.style.boxShadow = "none";
    }}
  />
);

// ─── main component ───────────────────────────────────────────────────────────

const ExamForm = () => {
  const [selectedExam, setSelectedExam] = useState("");
  const [formData, setFormData] = useState({});
  const [config, setConfig] = useState(null);
  const [rankError, setRankError] = useState("");
  const [primaryInputError, setPrimaryInputError] = useState("");
  const [rankMode, setRankMode] = useState("estimate");
  const [marksInput, setMarksInput] = useState("");
  const [marksError, setMarksError] = useState("");
  const [percentileInput, setPercentileInput] = useState("");
  const [percentileError, setPercentileError] = useState("");
  const [estimateInputType, setEstimateInputType] = useState("marks");
  const [estimateError, setEstimateError] = useState("");
  const [estimatedRank, setEstimatedRank] = useState(null);
  const [estimatedPercentile, setEstimatedPercentile] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [optionSearch, setOptionSearch] = useState("");
  const router = useRouter();

  const handleExamChange = (selectedOption) => {
    setSelectedExam(selectedOption.value);
    setConfig(examConfigs[selectedOption.value]);
    setPrimaryInputError("");
    const baseFormData = { exam: selectedOption.value, rank: "" };
    if (selectedOption.code !== undefined) baseFormData.code = selectedOption.code;
    if (selectedOption.value === "JoSAA") {
      baseFormData.qualifiedJeeAdv = "No";
      baseFormData.rankMode = "estimate";
      setRankMode("estimate");
      setMarksInput(""); setMarksError(""); setPercentileInput(""); setPercentileError("");
      setEstimateInputType("marks"); setEstimateError(""); setEstimatedRank(null); setEstimatedPercentile(null);
    } else {
      setRankMode("known");
      setMarksInput(""); setMarksError(""); setPercentileInput(""); setPercentileError("");
      setEstimateInputType("marks"); setEstimateError(""); setEstimatedRank(null); setEstimatedPercentile(null);
    }
    setFormData(baseFormData);
  };

  const handleInputChange = (name) => (selectedOption) => {
    const newFormData = { ...formData, [name]: selectedOption.label };
    if (selectedExam === "JoSAA" && name === "qualifiedJeeAdv") {
      if (selectedOption.label === "No" && newFormData.advRank) delete newFormData.advRank;
    }
    if (selectedExam === "JoSAA" && rankMode === "estimate" && name === "category") {
      newFormData.mainRank = "";
      setEstimatedRank(null); setEstimatedPercentile(null); setEstimateError("");
    }
    setFormData(newFormData);
  };

  const handleRankModeChange = (mode) => {
    setRankMode(mode);
    if (mode === "estimate") {
      setFormData((p) => {
        const n = { ...p, qualifiedJeeAdv: "No", mainRank: "", rankMode: "estimate" };
        delete n.advRank; return n;
      });
      setEstimatedRank(null); setEstimatedPercentile(null);
      setMarksInput(""); setMarksError(""); setPercentileInput(""); setPercentileError("");
      setEstimateInputType("marks"); setEstimateError("");
    } else {
      setFormData((p) => ({ ...p, rankMode: "known" }));
      setEstimatedRank(null); setEstimatedPercentile(null);
      setMarksInput(""); setMarksError(""); setPercentileInput(""); setPercentileError("");
      setEstimateInputType("marks"); setEstimateError("");
    }
  };

  const handleEstimateInputTypeChange = (type) => {
    setEstimateInputType(type);
    setEstimatedRank(null); setEstimatedPercentile(null); setEstimateError("");
    setMarksInput(""); setMarksError(""); setPercentileInput(""); setPercentileError("");
  };

  const handleMarksChange = (e) => {
    const v = e.target.value;
    setMarksInput(v); setEstimatedRank(null); setEstimatedPercentile(null); setEstimateError("");
    if (v === "") { setMarksError(""); return; }
    const m = Number(v);
    if (Number.isNaN(m) || m < 0 || m > 300) { setMarksError("Please enter marks between 0 and 300."); return; }
    setMarksError("");
  };

  const handlePercentileChange = (e) => {
    const v = e.target.value;
    setPercentileInput(v); setEstimatedRank(null); setEstimatedPercentile(null); setEstimateError("");
    if (v === "") { setPercentileError(""); return; }
    const p = Number(v);
    if (Number.isNaN(p) || p < 0 || p > 100) { setPercentileError("Please enter percentile between 0 and 100."); return; }
    setPercentileError("");
  };

  const handleEstimateRank = async () => {
    if (!formData.category) { setEstimateError("Please select your category first."); return; }
    if (estimateInputType === "marks") {
      if (marksInput === "") { setMarksError("Please enter your marks."); return; }
      if (marksError) return;
    } else {
      if (percentileInput === "") { setPercentileError("Please enter your percentile."); return; }
      if (percentileError) return;
    }
    setIsEstimating(true); setEstimateError("");
    try {
      const response = await fetch("/api/jee-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marks: estimateInputType === "marks" ? Number(marksInput) : undefined,
          percentile: estimateInputType === "percentile" ? Number(percentileInput) : undefined,
          category: formData.category,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setEstimateError(data.error || "Unable to estimate rank."); setIsEstimating(false); return; }
      setEstimatedRank(data.categoryRank); setEstimatedPercentile(data.percentile);
      setFormData((p) => {
        const n = { ...p, mainRank: String(data.categoryRank), qualifiedJeeAdv: "No", rankMode: "estimate" };
        delete n.advRank; return n;
      });
    } catch { setEstimateError("Unable to estimate rank right now."); }
    finally { setIsEstimating(false); }
  };

  const handleRankChange = (e) => {
    const entered = normalizePrimaryInputValue(selectedExam, e.target.value);
    const err = validatePrimaryInputValue(selectedExam, entered);
    const newFD = { ...formData };
    if (selectedExam === "JoSAA") newFD.mainRank = entered;
    else newFD.rank = entered;
    setPrimaryInputError(err); setFormData(newFD);
  };

  const handleAdvancedRankChange = (e) => {
    let v = e.target.value;
    const valid = /^\d+[pP]?$/.test(v) || v === "";
    if (!valid) setRankError("Please enter a valid rank (e.g., 104 or 104P)");
    else setRankError("");
    if (v.endsWith("p")) v = v.slice(0, -1) + "P";
    setFormData((p) => ({ ...p, advRank: v }));
  };

  const handleTneaScoreChange = (score, physics, chemistry, maths) => {
    setFormData((p) => ({ ...p, rank: score, physicsMarks: physics, chemistryMarks: chemistry, mathsMarks: maths }));
  };

  const handleSubmit = async () => {
    if (selectedExam === "JoSAA") {
      if (!formData.mainRank || formData.mainRank === "") { alert("Please enter your JEE Main rank."); return; }
      if (formData.qualifiedJeeAdv === "Yes" && (!formData.advRank || formData.advRank === "")) {
        alert("Please enter your JEE Advanced rank since you qualified for JEE Advanced."); return;
      }
      const cleaned = { ...formData };
      if (cleaned.rank) delete cleaned.rank;
      router.push(`/college_predictor?${getCleanQueryEntries(cleaned).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`);
    } else {
      if (primaryInputError) { alert(primaryInputError); return; }
      router.push(`/college_predictor?${getCleanQueryEntries(formData).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`);
    }
  };

  const isSubmitDisabled = () => {
    if (selectedExam === "TNEA") {
      return !formData.rank || formData.rank === "" || Object.entries(formData)
        .filter(([k]) => !["rank","physicsMarks","chemistryMarks","mathsMarks"].includes(k))
        .some(([,v]) => !v);
    }
    if (selectedExam === "JoSAA") {
      const req = ["exam","category","gender","program","homeState","qualifiedJeeAdv","mainRank"];
      const missing = req.some((f) => !formData[f]);
      if (formData.qualifiedJeeAdv === "Yes") return missing || !formData.advRank || formData.advRank === "";
      return missing || !formData.mainRank || formData.mainRank === "";
    }
    return !!primaryInputError || !formData.rank || formData.rank === "" || formData.rank === 0 ||
      Object.entries(formData).filter(([k]) => k !== "rank").some(([,v]) => !v);
  };

  const examOptions = Object.keys(examConfigs)
    .filter((e) => e !== "JEE Main-JOSAA" && e !== "JEE Advanced")
    .map((e) => ({ value: e, label: e, code: examConfigs[e].code, apiEndpoint: examConfigs[e].apiEndpoint }));

  const normalizeOption = (opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : { value: opt.value, label: opt.label };

  const getFieldControl = (field, index) => {
    const options = field.options.map(normalizeOption);
    const lowerName = field.name.toLowerCase();
    if (options.length <= 2) return <SegmentToggle name={field.name} options={options} formData={formData} onChange={handleInputChange(field.name)} />;
    if (lowerName.includes("state") || lowerName.includes("region"))
      return <SearchableSelector name={field.name} options={options} formData={formData} onChange={handleInputChange(field.name)} search={optionSearch} onSearchChange={setOptionSearch} />;
    if (lowerName.includes("category")) return <ChipSelector name={field.name} options={options} formData={formData} onChange={handleInputChange(field.name)} />;
    if (index % 3 === 0) return <CardSelector name={field.name} options={options} formData={formData} onChange={handleInputChange(field.name)} />;
    if (index % 3 === 1) return <ChipSelector name={field.name} options={options} formData={formData} onChange={handleInputChange(field.name)} />;
    return <SearchableSelector name={field.name} options={options} formData={formData} onChange={handleInputChange(field.name)} search={optionSearch} onSearchChange={setOptionSearch} />;
  };

  const fieldsToRender = selectedExam
    ? selectedExam === "JoSAA"
      ? config?.fields?.filter((f) => f.name !== "qualifiedJeeAdv") || []
      : config?.fields || []
    : [];

  const buildWizardSteps = () => {
    const steps = [{
      id: "exam",
      title: "Choose your exam",
      helper: "Start by selecting the counselling or entrance process.",
      isComplete: !!selectedExam,
      content: <ExamSelector examOptions={examOptions} selectedExam={selectedExam} onSelect={handleExamChange} />,
    }];

    if (!selectedExam || !config) return steps;

    fieldsToRender.forEach((field, index) => {
      steps.push({
        id: field.name,
        title: typeof field.label === "function" ? field.label(formData) : field.label,
        helper: "Select the option that matches your profile.",
        isComplete: !!formData[field.name],
        content: getFieldControl(field, index),
      });
    });

    if (selectedExam === "TNEA") {
      steps.push({
        id: "tnea-score",
        title: "Enter TNEA subject marks",
        helper: "We calculate your composite score automatically.",
        isComplete: !!formData.rank,
        content: <TneaScoreCalculator onScoreChange={handleTneaScoreChange} />,
      });
    } else if (selectedExam === "JoSAA") {
      steps.push({
        id: "rank-mode",
        title: "Do you need rank estimation?",
        helper: "Pick estimation if you only know marks or percentile.",
        isComplete: true,
        content: <ModeToggle
          value={rankMode}
          onChange={handleRankModeChange}
          options={[{ value: "estimate", label: "Yes, estimate rank" }, { value: "known", label: "No, I know my rank" }]}
        />,
      });

      if (rankMode === "known") {
        const qf = config.fields.find((f) => f.name === "qualifiedJeeAdv");
        if (qf) {
          steps.push({
            id: "qualifiedJeeAdv",
            title: qf.label,
            helper: "Tell us if you are also eligible through JEE Advanced.",
            isComplete: !!formData.qualifiedJeeAdv,
            content: <SegmentToggle name="qualifiedJeeAdv" options={qf.options.map(normalizeOption)} formData={formData} onChange={handleInputChange("qualifiedJeeAdv")} />,
          });
        }
      }

      if (rankMode === "estimate") {
        steps.push({
          id: "estimate-input-type",
          title: "Choose estimation method",
          helper: "Estimate using marks or percentile.",
          isComplete: true,
          content: <ModeToggle
            value={estimateInputType}
            onChange={handleEstimateInputTypeChange}
            options={[{ value: "marks", label: "Marks" }, { value: "percentile", label: "Percentile" }]}
          />,
        });

        steps.push({
          id: "estimate-rank",
          title: estimateInputType === "marks"
            ? config?.estimateMarksInput?.label || "Enter JEE Main marks out of 300"
            : config?.estimatePercentileInput?.label || "Enter JEE Main percentile",
          helper: "Click estimate to generate your likely category rank.",
          isComplete: !!estimatedRank && estimatedPercentile !== null,
          content: (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {estimateInputType === "marks" ? (
                <>
                  <ModernInput
                    type="number" step="1" min="0" max="300"
                    value={marksInput} onChange={handleMarksChange}
                    onKeyDown={(e) => { if ([".", "e", "E", "+", "-", " "].includes(e.key)) e.preventDefault(); }}
                    placeholder={config?.estimateMarksInput?.placeholder || "e.g., 182"}
                    error={marksError}
                  />
                  {marksError && <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{marksError}</p>}
                </>
              ) : (
                <>
                  <ModernInput
                    type="number" step="0.01" min="0" max="100"
                    value={percentileInput} onChange={handlePercentileChange}
                    onKeyDown={(e) => { if (["e", "E", "+", "-", " "].includes(e.key)) e.preventDefault(); }}
                    placeholder={config?.estimatePercentileInput?.placeholder || "e.g., 97.45"}
                    error={percentileError}
                  />
                  {percentileError && <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{percentileError}</p>}
                </>
              )}
              <button
                type="button" onClick={handleEstimateRank}
                disabled={isEstimating || (estimateInputType === "marks" ? marksInput === "" || !!marksError : percentileInput === "" || !!percentileError) || !formData.category}
                style={{
                  padding: "12px 20px",
                  borderRadius: 12,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: "var(--brand)",
                  color: "var(--brand-contrast)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Sparkles size={15} />
                {isEstimating ? "Estimating…" : "Estimate Rank"}
              </button>
              {estimateError && <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{estimateError}</p>}
              {estimatedRank && estimatedPercentile !== null && (
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "1.5px solid #dbe3ed",
                    background: "var(--bg-soft)",
                    fontSize: 13,
                    color: "var(--text-muted)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <p style={{ margin: 0 }}>Predicted Percentile: <strong style={{ color: "var(--brand)" }}>{estimatedPercentile}</strong></p>
                  <p style={{ margin: 0 }}>Predicted Category Rank: <strong style={{ color: "var(--brand)" }}>{estimatedRank}</strong></p>
                  <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-muted)" }}>Based on avg data of 10k+ students from 2024–25. Actual results may vary.</p>
                </div>
              )}
            </div>
          ),
        });
      } else {
        steps.push({
          id: "main-rank",
          title: getPrimaryInputConfig(selectedExam).label,
          helper: "Enter your JEE Main category rank.",
          isComplete: !!formData.mainRank && !primaryInputError,
          content: (
            <>
              <ModernInput
                type="number"
                step={getPrimaryInputConfig(selectedExam).step}
                min={getPrimaryInputConfig(selectedExam).min}
                max={getPrimaryInputConfig(selectedExam).max}
                value={formData.mainRank || ""} onChange={handleRankChange}
                onKeyDown={(e) => { if (["e","E","+","-"," "].includes(e.key) || (!getPrimaryInputConfig(selectedExam).allowDecimal && e.key === ".")) e.preventDefault(); }}
                placeholder={getPrimaryInputConfig(selectedExam).placeholder}
                error={primaryInputError}
              />
              {primaryInputError && <p style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>{primaryInputError}</p>}
            </>
          ),
        });

        if (formData.qualifiedJeeAdv === "Yes") {
          steps.push({
            id: "advRank",
            title: config?.advancedInput?.label || "Enter JEE Advanced Category Rank",
            helper: "Enter a plain rank like 104 or with suffix like 104P.",
            isComplete: !!formData.advRank && !rankError,
            content: (
              <>
                <ModernInput
                  type="string" step="1"
                  value={formData.advRank || ""} onChange={handleAdvancedRankChange}
                  onKeyDown={(e) => { if ([".","e","E","+","-"," "].includes(e.key)) e.preventDefault(); }}
                  placeholder={config?.advancedInput?.placeholder || "e.g., 104 or 104P"}
                  error={rankError}
                />
                {rankError && <p style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>{rankError}</p>}
              </>
            ),
          });
        }
      }
    } else {
      steps.push({
        id: "primary-input",
        title: getPrimaryInputConfig(selectedExam).label,
        helper: getPrimaryInputConfig(selectedExam).helperText || "",
        isComplete: !!formData.rank && !primaryInputError,
        content: (
          <>
            <ModernInput
              type="number"
              step={getPrimaryInputConfig(selectedExam).step}
              min={getPrimaryInputConfig(selectedExam).min}
              max={getPrimaryInputConfig(selectedExam).max}
              value={formData.rank || ""} onChange={handleRankChange}
              onKeyDown={(e) => { if (["e","E","+","-"," "].includes(e.key) || (!getPrimaryInputConfig(selectedExam).allowDecimal && e.key === ".")) e.preventDefault(); }}
              placeholder={getPrimaryInputConfig(selectedExam).placeholder}
              error={primaryInputError}
            />
            {primaryInputError && <p style={{ marginTop: 6, fontSize: 13, color: "#b91c1c" }}>{primaryInputError}</p>}
          </>
        ),
      });
    }

    steps.push({
      id: "review",
      title: "Review & continue",
      helper: "All required inputs are complete. Submit to view your predictions.",
      isComplete: !isSubmitDisabled(),
      content: (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {Object.entries(formData)
            .filter(([, v]) => v !== "" && v !== undefined && v !== null)
            .map(([k, v]) => <ReviewChip key={k} label={k} value={v} />)}
        </div>
      ),
    });

    return steps;
  };

  const steps = buildWizardSteps();

  useEffect(() => {
    if (currentStep > steps.length - 1) setCurrentStep(Math.max(0, steps.length - 1));
  }, [currentStep, steps.length]);

  useEffect(() => { setOptionSearch(""); }, [currentStep, selectedExam]);

  const activeStepIndex = Math.min(currentStep, Math.max(steps.length - 1, 0));
  const activeStep = steps[activeStepIndex];
  const isLastStep = activeStepIndex === steps.length - 1;
  const completedCount = steps.filter((s) => s.isComplete).length;
  const progressPercent = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;
  const visibleSteps = steps.filter((s, i) => s.isComplete || i <= activeStepIndex + 2);

  // ─── styles ────────────────────────────────────────────────────────────────
  const shell = {
    minHeight: "calc(100vh - 138px)",
    display: "flex",
    flexDirection: "column",
    paddingTop: 20,
    paddingBottom: 32,
    background: "#f5f7fa",
  };

  const sidebar = {
    background: "var(--surface)",
    border: "1px solid var(--stroke)",
    borderRadius: 20,
    padding: "20px 16px",
  };

  const mainPanel = {
    background: "var(--surface)",
    border: "1px solid var(--stroke)",
    borderRadius: 20,
    padding: "28px 28px",
    flex: 1,
  };

  return (
    <>
      <Head>
        <title>College Predictor — Find Your Best Colleges</title>
      </Head>

      <div style={shell}>
        <div className="app-page" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Script src="https://www.googletagmanager.com/gtag/js?id=G-FHGVRT52L7" strategy="afterInteractive" />
          <Script id="google-analytics" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date()); gtag('config', 'G-FHGVRT52L7');
          `}</Script>

          {/* ── header ── */}
          <div
            style={{
              borderRadius: 20,
              padding: "22px 28px",
              background: "var(--surface)",
              border: "1px solid var(--stroke)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'Sora', sans-serif",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: "var(--bg-soft)",
                border: "1px solid #dbe3ed",
                color: "var(--text-muted)",
                width: "fit-content",
              }}
            >
              <Sparkles size={11} /> Step-by-step Predictor
            </span>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <h1
                  style={{
                    margin: "6px 0 4px",
                    fontSize: "clamp(22px, 3vw, 32px)",
                    fontWeight: 800,
                    fontFamily: "'Sora', sans-serif",
                    color: "var(--text)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {getConstants().TITLE}
                </h1>
                <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", fontFamily: "'Manrope', sans-serif" }}>
                  Answer one question at a time and get the best college recommendations.
                </p>
              </div>
              <span
                style={{
                  padding: "7px 16px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "'Sora', sans-serif",
                  background: "var(--accent-soft)",
                  border: "1px solid var(--accent-border)",
                  color: "var(--brand)",
                }}
              >
                Wizard Mode
              </span>
            </div>
          </div>

          {/* ── body ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, borderRadius: 20, padding: "20px", background: "var(--surface)", border: "1px solid var(--stroke)" }}>

            {/* disclaimer */}
            {selectedExam === "TGEAPCET" && formData.category === "EWS" && (
              <div style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid var(--accent-border)", background: "var(--accent-soft)", fontSize: 13, color: "var(--brand)" }}>
                Showing OC category data as EWS-specific data is limited.
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "240px minmax(0,1fr)",
                gap: 16,
                flex: 1,
              }}
            >
              {/* sidebar */}
              <aside style={sidebar}>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, fontFamily: "'Sora', sans-serif", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Progress</p>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: "'Sora', sans-serif",
                        color: progressPercent === 100 ? "#b99633" : "var(--brand)",
                      }}
                    >
                      {progressPercent}%
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        borderRadius: 999,
                        background: progressPercent === 100
                          ? "#b99633"
                          : "var(--brand)",
                        width: `${progressPercent}%`,
                        transition: "width 0.4s ease",
                        boxShadow: "none",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {visibleSteps.map((step) => {
                    const idx = steps.findIndex((s) => s.id === step.id);
                    const isActive = idx === activeStepIndex;
                    const isDone = idx < activeStepIndex || step.isComplete;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setCurrentStep(idx)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: isActive
                            ? "1px solid var(--brand)"
                            : "1px solid var(--stroke)",
                          background: isActive
                            ? "var(--accent-soft)"
                            : "var(--surface)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 0.2s ease",
                          boxShadow: isActive ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                        }}
                      >
                        <StepBadge index={idx} isActive={isActive} isDone={isDone} />
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: "'Manrope', sans-serif",
                            color: isActive ? "var(--brand)" : isDone ? "var(--text-muted)" : "var(--text-muted)",
                            lineHeight: 1.4,
                            WebkitLineClamp: 2,
                            display: "-webkit-box",
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {step.title}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {visibleSteps.length < steps.length && (
                  <p style={{ marginTop: 10, fontSize: 11, color: "var(--text-muted)", fontFamily: "'Manrope', sans-serif" }}>
                    +{steps.length - visibleSteps.length} more upcoming steps
                  </p>
                )}
              </aside>

              {/* main panel */}
              <section style={mainPanel}>
                <div style={{ marginBottom: 18 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "'Sora', sans-serif",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      marginBottom: 8,
                    }}
                  >
                    <ChevronRight size={11} />
                    Step {activeStepIndex + 1} of {steps.length}
                  </span>
                  <h2
                    style={{
                      margin: "0 0 6px",
                      fontSize: "clamp(18px, 2.5vw, 24px)",
                      fontWeight: 700,
                      fontFamily: "'Sora', sans-serif",
                      color: "var(--text)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {activeStep?.title}
                  </h2>
                  {activeStep?.helper && (
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)", fontFamily: "'Manrope', sans-serif" }}>
                      {activeStep.helper}
                    </p>
                  )}
                </div>

                <div key={activeStep?.id} style={{ animation: "fadeInUp 0.3s ease" }}>
                  {activeStep?.content}
                </div>
              </section>
            </div>

            {/* footer nav */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: 16,
                borderTop: "1px solid #e5e7eb",
                marginTop: 4,
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentStep((p) => Math.max(0, p - 1))}
                disabled={activeStepIndex === 0}
                style={{
                  padding: "10px 20px",
                  borderRadius: 12,
                  border: "1px solid var(--stroke)",
                  background: "transparent",
                  color: activeStepIndex === 0 ? "#cbd5e1" : "var(--text-muted)",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "'Sora', sans-serif",
                  cursor: activeStepIndex === 0 ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                ← Back
              </button>

              {!isLastStep ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((p) => Math.min(steps.length - 1, p + 1))}
                  disabled={!activeStep?.isComplete}
                  style={{
                    padding: "11px 24px",
                    borderRadius: 12,
                    border: "none",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "'Sora', sans-serif",
                    cursor: activeStep?.isComplete ? "pointer" : "not-allowed",
                    transition: "all 0.2s ease",
                    background: activeStep?.isComplete
                      ? "var(--brand)"
                      : "var(--bg-soft)",
                    color: activeStep?.isComplete ? "var(--brand-contrast)" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: activeStep?.isComplete ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                  }}
                >
                  Next <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitDisabled()}
                  onClick={handleSubmit}
                  style={{
                    padding: "12px 28px",
                    borderRadius: 12,
                    border: "none",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "'Sora', sans-serif",
                    cursor: isSubmitDisabled() ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                    background: !isSubmitDisabled()
                      ? "var(--brand)"
                      : "var(--bg-soft)",
                    color: !isSubmitDisabled() ? "var(--brand-contrast)" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    boxShadow: !isSubmitDisabled() ? "0 1px 2px rgba(15,23,42,0.06)" : "none",
                  }}
                >
                  View Predictions <Sparkles size={15} />
                </button>
              )}
            </div>

            {isLastStep && isSubmitDisabled() && (
              <p style={{ marginTop: 6, fontSize: 13, color: "var(--brand)", fontFamily: "'Manrope', sans-serif" }}>
                {selectedExam === "JoSAA" && formData.qualifiedJeeAdv === "Yes" && (!formData.advRank || formData.advRank === "")
                  ? "Please enter your JEE Advanced rank."
                  : selectedExam === "JoSAA" && (!formData.mainRank || formData.mainRank === "")
                  ? "Please enter your JEE Main rank."
                  : "Please complete all required steps before continuing."}
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: var(--text-muted) !important; }
        input:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
      `}</style>
    </>
  );
};

export default ExamForm;