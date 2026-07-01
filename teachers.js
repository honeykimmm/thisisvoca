const TEACHERS = [
  {
    id: "kim",
    name: "김현지",
    classes: [
      { id: "mw", name: "월수반" },
      { id: "mf", name: "월금반" },
      { id: "tt", name: "화목반" }
    ]
  },
  {
    id: "park",
    name: "박민영",
    classes: [
      { id: "mw", name: "월수반" },
      { id: "mf", name: "월금반" },
      { id: "tt", name: "화목반" }
    ]
  },
  {
    id: "choi",
    name: "최혜은",
    classes: [
      { id: "mw", name: "월수반" },
      { id: "mf", name: "월금반" },
      { id: "tt", name: "화목반" }
    ]
  }
];

function findTeacher(teacherId) {
  return TEACHERS.find(t => t.id === teacherId);
}

function findClass(teacherId, classId) {
  const t = findTeacher(teacherId);
  if (!t) return null;
  return t.classes.find(c => c.id === classId);
}
