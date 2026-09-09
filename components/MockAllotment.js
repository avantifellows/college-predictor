import React, { useEffect, useState } from "react";
import JosaaMockAllotment from "./JosaaMockAllotment";
import MhtcetMockAllotment from "./MhtcetMockAllotment";
import { cardClass, primaryBtn } from "./mockAllotmentTheme";

// Entry point for /mock-allotment: an exam chooser in front of two otherwise
// independent flows (JosaaMockAllotment, MhtcetMockAllotment). Neither flow
// knows the other exists — this just decides which one to render, and
// remembers the choice so a reload returns to the same one. Switching exams
// never touches either flow's own persisted progress (each keeps its own
// localStorage key), only which one is currently shown.
const EXAM_CHOICE_KEY = "mockAllotmentExamChoice_v1";

const EXAMS = [
  {
    id: "josaa",
    name: "JoSAA",
    tagline: "IITs, NITs, IIITs & GFTIs",
    detail: "Ranked on your JEE Main / JEE Advanced rank.",
  },
  {
    id: "mhtcet",
    name: "MHT CET",
    tagline: "Maharashtra Engineering, Pharmacy, Architecture & B.Design",
    detail: "Ranked on your MHT-CET merit rank (or B.Arch/B.Design merit no.).",
  },
];

const ExamCard = ({ exam, onSelect }) => (
  <div className={`${cardClass} flex flex-col`}>
    <h2 className="text-lg font-bold text-[#3a2c28]">{exam.name}</h2>
    <p className="mt-1 text-sm font-semibold text-[#8a6d63]">
      {exam.tagline}
    </p>
    <p className="mt-2 flex-1 text-sm text-[#5b4a45]">{exam.detail}</p>
    <button
      type="button"
      className={`${primaryBtn} mt-4 self-start`}
      onClick={() => onSelect(exam.id)}
    >
      Practice {exam.name} →
    </button>
  </div>
);

const ExamPicker = ({ onSelect }) => (
  <div className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
    <h1 className="text-center text-2xl font-bold text-[#3a2c28] md:text-3xl">
      Mock Allotment
    </h1>
    <p className="mt-2 text-center text-sm text-[#6d5550]">
      Practice choice-filling and counselling for a real exam — pick which
      one.
    </p>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {EXAMS.map((exam) => (
        <ExamCard key={exam.id} exam={exam} onSelect={onSelect} />
      ))}
    </div>
  </div>
);

const MockAllotment = () => {
  const [exam, setExam] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(EXAM_CHOICE_KEY);
      if (saved === "josaa" || saved === "mhtcet") setExam(saved);
    } catch {
      // localStorage unavailable — just start at the picker
    }
    setHydrated(true);
  }, []);

  const chooseExam = (id) => {
    setExam(id);
    try {
      window.localStorage.setItem(EXAM_CHOICE_KEY, id);
    } catch {
      // ignore — worst case, a reload returns to the picker
    }
  };

  const changeExam = () => {
    setExam(null);
    try {
      window.localStorage.removeItem(EXAM_CHOICE_KEY);
    } catch {
      // ignore
    }
  };

  if (!hydrated) return null;
  if (!exam) return <ExamPicker onSelect={chooseExam} />;
  if (exam === "mhtcet")
    return <MhtcetMockAllotment onChangeExam={changeExam} />;
  return <JosaaMockAllotment onChangeExam={changeExam} />;
};

export default MockAllotment;
