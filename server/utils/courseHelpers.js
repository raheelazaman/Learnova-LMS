import { randomUUID } from 'node:crypto';

// Fill in chapterId / lectureId / order fields the client may omit.
export const normalizeContent = (content = []) =>
  content.map((chapter, ci) => ({
    chapterId: chapter.chapterId || randomUUID(),
    chapterOrder: chapter.chapterOrder ?? ci + 1,
    chapterTitle: chapter.chapterTitle,
    chapterContent: (chapter.chapterContent || []).map((lecture, li) => ({
      lectureId: lecture.lectureId || randomUUID(),
      lectureTitle: lecture.lectureTitle,
      lectureDuration: lecture.lectureDuration,
      lectureUrl: lecture.lectureUrl || '',
      isPreviewFree: Boolean(lecture.isPreviewFree),
      lectureOrder: lecture.lectureOrder ?? li + 1,
    })),
  }));

export const totalLectures = (course) =>
  (course.courseContent || []).reduce((n, ch) => n + (ch.chapterContent?.length || 0), 0);

export const allLectureIds = (course) =>
  (course.courseContent || []).flatMap((ch) => (ch.chapterContent || []).map((l) => l.lectureId));

// Price the student actually pays.
export const finalPrice = (course) =>
  Number((course.coursePrice - (course.discount * course.coursePrice) / 100).toFixed(2));

// Public view: hide video URLs of lectures that are not free previews.
export const toPublicCourse = (course) => {
  const obj = typeof course.toObject === 'function' ? course.toObject() : { ...course };
  obj.courseContent = (obj.courseContent || []).map((ch) => ({
    ...ch,
    chapterContent: (ch.chapterContent || []).map((l) => ({
      ...l,
      lectureUrl: l.isPreviewFree ? l.lectureUrl : '',
    })),
  }));
  return obj;
};
