import type { ModuleType } from '../../../contracts/common';
import type { UserRecordDetailVO } from '../../../contracts/records';
import { resolveApiAssetUrl } from '../../../lib/apiAssetUrl';
import { apiModuleToLabel } from './recordsModel';

export type RecordDetailView = {
  recordId: number;
  moduleLabel: 'Reading' | 'Listening' | 'Writing' | 'Speaking';
  layoutType: string;
  title: string;
  scoreText: string;
  status: string;
  createdTime: string | null;
  exam?: ExamRecordDetailView;
  writing?: WritingRecordDetailView;
  speaking?: SpeakingRecordDetailView;
};

export type ExamRecordDetailView = {
  testTitle: string;
  totalScore: number | null;
  parts: ExamRecordPartView[];
  questions: ExamRecordQuestionView[];
  testAudioUrl: string | null;
  testAudioTitle: string | null;
  testAudioTranscriptText: string;
  allowAudioSeek: boolean;
  partGroupAudios: ExamRecordAudioView[];
};

export type ExamRecordPartView = {
  partNumber: number;
  partGroupId: number | null;
  title: string;
  passageTitle: string;
  passageContent: string;
  audios: ExamRecordAudioView[];
};

export type ExamRecordAudioView = {
  id: number;
  testId: number;
  partGroupId: number | null;
  title: string;
  audioUrl: string;
  durationSeconds?: number;
  transcriptText: string;
};

export type ExamRecordQuestionView = {
  id: number;
  questionNumber: number;
  questionNoEnd?: number;
  questionType: string;
  answerMode: string;
  questionText: string;
  imageUrl: string | null;
  imageUrls: string[];
  partNumber: number | null;
  partGroupId: number | null;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  score: number | null;
  options: Array<{ label: string; text: string }>;
  template?: string;
  tableRows?: string[][];
  tableHeaderDark?: boolean;
  blanks: Array<{ no: number; questionId?: number; questionNumber?: number }>;
  bank: string[];
  pairs: Array<{ left: string; answer?: string }>;
  groupGuideText?: string;
  groupRequirementText?: string;
};

export type WritingRecordDetailView = {
  questionTitle: string;
  questionDescription: string;
  questionImages: WritingRecordImageView[];
  previewAssets: WritingRecordPreviewAssetView[];
  taskType: string;
  chartType: string | null;
  inputType: string;
  answerText: string;
  answerSource: string;
  aiScore: number | null;
  aiFeedback: string;
  aiStatus: string;
  attachments: WritingRecordAttachmentView[];
  attachmentNames: string[];
};

export type WritingRecordPreviewAssetView = {
  sourceType: string;
  fileType: 'IMAGE' | 'PDF' | 'FILE';
  fileName: string;
  fileUrl: string;
  objectKey: string;
  sortOrder: number;
  label: string;
  contentType: string;
};

export type WritingRecordImageView = {
  url: string;
  objectKey: string;
  sortOrder: number;
};

export type WritingRecordAttachmentView = {
  fileName: string;
  fileUrl: string | null;
  contentType: string;
  fileType: 'IMAGE' | 'PDF' | 'FILE';
  size: number | null;
};

export type SpeakingRecordDetailView = {
  overallScore: number | null;
  feedback: string;
  conversations: SpeakingConversationView[];
};

export type SpeakingConversationView = {
  recordId: number;
  part: string;
  questionText: string;
  cueCard: string;
  audioUrl: string;
  transcript: string;
  overallScore: number | null;
  fluencyAndCoherence: number | null;
  lexicalResource: number | null;
  grammaticalRangeAndAccuracy: number | null;
  pronunciation: number | null;
  feedback: string;
  relevanceComment: string;
  qualityComment: string;
};

export function mapApiRecordDetailToView(payload: UserRecordDetailVO): RecordDetailView {
  const review = asRecord(payload.review);
  const detail = asRecord(payload.detail);
  const moduleType = stringValue(review.moduleType ?? payload.moduleType, 'READING').toUpperCase() as ModuleType;
  const moduleLabel = apiModuleToLabel(moduleType);
  const layoutType = stringValue(review.layoutType ?? payload.detailType, payload.detailType);
  const score = nullableNumber(review.score ?? detail.score ?? detail.totalScore ?? detail.aiScore ?? detail.overallScore);

  const view: RecordDetailView = {
    recordId: Number(payload.recordId ?? detail.recordId ?? review.recordId ?? 0),
    moduleLabel,
    layoutType,
    title: stringValue(review.title ?? detail.title ?? detail.name ?? detail.questionTitle ?? detail.testTitle ?? detail.test_title, `${moduleLabel} record`),
    scoreText: stringValue(review.scoreText, score === null ? 'Pending' : formatScore(moduleType, score)),
    status: stringValue(review.status ?? detail.status ?? detail.aiStatus ?? detail.answerStatus, 'N/A'),
    createdTime: nullableString(review.createdTime ?? detail.createdTime),
  };

  if (layoutType === 'EXAM_PAGE' || payload.detailType === 'READING_RECORD_DETAIL' || payload.detailType === 'LISTENING_RECORD_DETAIL') {
    view.exam = mapExamReview(asRecord(review.examPageReview ?? detail), moduleType);
  }

  if (layoutType === 'WRITING_REVIEW' || payload.detailType === 'WRITING_RECORD_DETAIL') {
    view.writing = mapWritingReview(asRecord(review.writingReview ?? detail));
  }

  if (layoutType === 'SPEAKING_SESSION_REVIEW' || payload.detailType === 'SPEAKING_RECORD_DETAIL') {
    view.speaking = mapSpeakingReview(asRecord(review.speakingSessionReview ?? detail));
  }

  return view;
}

function mapExamReview(source: Record<string, any>, moduleType: ModuleType): ExamRecordDetailView {
  const answersByQuestionId = new Map(
    normalizeUnknownArray(source.answers).map((answer) => {
      const item = asRecord(answer);
      return [
        String(item.questionId ?? item.question_id ?? item.id ?? ''),
        stringValue(item.userAnswer ?? item.user_answer ?? item.answer ?? item.answers),
      ];
    }),
  );
  const answersByQuestionNumber = new Map(
    normalizeUnknownArray(source.answers).map((answer) => {
      const item = asRecord(answer);
      return [
        String(item.questionNumber ?? item.question_number ?? item.questionNo ?? item.question_no ?? item.no ?? ''),
        stringValue(item.userAnswer ?? item.user_answer ?? item.answer ?? item.answers),
      ];
    }),
  );
  const nestedQuestions = collectNestedExamQuestions(source);
  const questionSources = [
    ...normalizeUnknownArray(source.questionReviews ?? source.question_reviews ?? source.questions),
    ...nestedQuestions,
  ];
  const questions = questionSources.map((question, index) => {
    const item = asRecord(question);
    const metadata = parseJsonObject(item.optionsJson ?? item.options_json ?? item.metadataJson ?? item.metadata_json);
    const questionId = String(item.questionId ?? item.question_id ?? item.id ?? index + 1);
    const questionNumber = Number(item.questionNumber ?? item.question_number ?? item.questionNo ?? item.question_no ?? index + 1);
    const questionType = stringValue(item.questionType ?? item.question_type ?? metadata.questionType ?? metadata.question_type, 'QUESTION');
    const questionNoEnd = resolveQuestionNoEnd(item, metadata, questionNumber, questionType);
    const id = Number(item.questionId ?? item.question_id ?? item.id ?? index + 1);
    return {
    id,
    questionNumber,
    questionNoEnd,
    questionType,
    answerMode: resolveAnswerMode(item, metadata, questionType, questionNumber, questionNoEnd),
    questionText: stringValue(item.questionText ?? item.question_text ?? item.prompt ?? metadata.questionText ?? metadata.question_text ?? metadata.prompt, `Question ${index + 1}`),
    imageUrl: nullableString(item.imageUrl ?? item.image_url),
    imageUrls: mapQuestionImages(item.images ?? item.groupImages ?? item.group_images, item.imageUrl ?? item.image_url),
    partNumber: nullableNumber(item.partNumber ?? item.part_number ?? item.part),
    partGroupId: nullableNumber(item.partGroupId ?? item.part_group_id ?? item.groupId ?? item.group_id),
    userAnswer: stringValue(item.userAnswer ?? item.user_answer ?? answersByQuestionId.get(questionId) ?? answersByQuestionNumber.get(String(questionNumber))),
    correctAnswer: stringValue(item.correctAnswer ?? item.correct_answer),
    isCorrect: Boolean(item.isCorrect ?? item.is_correct),
    score: resolveQuestionScore(item, metadata, questionType, questionNumber, questionNoEnd),
    options: mapQuestionOptions(item.options ?? item.optionsJson ?? item.options_json ?? metadata.options ?? metadata.choices),
    template: optionalString(item.template ?? item.questionTemplate ?? item.question_template ?? metadata.template ?? metadata.questionTemplate ?? metadata.question_template),
    tableRows: mapStringTable(item.tableRows ?? item.table_rows ?? item.tableRowsJson ?? item.table_rows_json ?? metadata.tableRows ?? metadata.table_rows ?? metadata.rows),
    tableHeaderDark: booleanValue(item.tableHeaderDark ?? item.table_header_dark ?? metadata.tableHeaderDark ?? metadata.table_header_dark, true),
    blanks: mapQuestionBlanks(item.blanks ?? metadata.blanks ?? item.answers, questionNumber, id),
    bank: mapStringList(item.bank ?? item.answerBank ?? item.answer_bank ?? item.labels ?? metadata.bank ?? metadata.answerBank ?? metadata.answer_bank),
    pairs: mapQuestionPairs(item.pairs ?? metadata.pairs),
    groupGuideText: optionalString(item.groupGuideText ?? item.group_guide_text ?? item.instructionText ?? item.instruction_text ?? item.instruction ?? metadata.instructionText ?? metadata.instruction_text ?? metadata.instruction),
    groupRequirementText: optionalString(item.groupRequirementText ?? item.group_requirement_text ?? metadata.groupRequirementText ?? metadata.group_requirement_text ?? metadata.prompt),
    };
  });
  const passages = [
    ...normalizeUnknownArray(source.passages ?? source.readingPassages ?? source.reading_passages),
    ...collectNestedExamPassages(source),
  ];
  const sourceParts = normalizeExamPartSources(source, passages, moduleType);
  const testAudio = asRecord(source.testAudio ?? source.test_audio ?? source.audio);
  const partGroupAudios = [
    ...normalizeUnknownArray(source.partGroupAudios ?? source.part_group_audios ?? source.audios),
    ...collectNestedExamAudios(source),
  ]
    .map(mapExamAudio)
    .filter((audio): audio is ExamRecordAudioView => Boolean(audio));

  return {
    testTitle: stringValue(source.testTitle ?? source.test_title ?? source.title ?? source.name, 'Exam review'),
    totalScore: nullableNumber(source.totalScore ?? source.total_score),
    parts: sourceParts.map((part, index) => {
      const matchedPassage = findPassageForPart(passages, part, index);
      const partAudios = normalizeUnknownArray(part.audios)
        .map(mapExamAudio)
        .filter((audio): audio is ExamRecordAudioView => Boolean(audio));

      return {
        partNumber: Number(part.partNumber ?? part.part ?? matchedPassage?.partNumber ?? matchedPassage?.part_number ?? matchedPassage?.passageNo ?? matchedPassage?.passage_no ?? index + 1),
        partGroupId: nullableNumber(part.partGroupId ?? part.part_group_id ?? part.groupId ?? part.group_id ?? part.id ?? matchedPassage?.partGroupId ?? matchedPassage?.part_group_id),
        title: stringValue(part.title ?? part.passageTitle ?? part.passage_title ?? matchedPassage?.title ?? matchedPassage?.passageTitle ?? matchedPassage?.passage_title, `Part ${index + 1}`),
        passageTitle: stringValue(part.passageTitle ?? part.passage_title ?? part.title ?? matchedPassage?.passageTitle ?? matchedPassage?.passage_title ?? matchedPassage?.title, `Part ${index + 1}`),
        passageContent: stringValue(part.passageContent ?? part.passage_content ?? part.content ?? matchedPassage?.passageContent ?? matchedPassage?.passage_content ?? matchedPassage?.content),
        audios: partAudios,
      };
    }),
    questions,
    testAudioUrl: resolveApiAssetUrl(testAudio.audioUrl ?? testAudio.audio_url ?? testAudio.url),
    testAudioTitle: nullableString(testAudio.title ?? testAudio.name),
    testAudioTranscriptText: stringValue(testAudio.transcriptText ?? testAudio.transcript_text ?? testAudio.transcript),
    allowAudioSeek: booleanValue(source.allowAudioSeek ?? source.allow_audio_seek, true),
    partGroupAudios,
  };
}

function mapExamAudio(value: unknown): ExamRecordAudioView | null {
  const source = asRecord(value);
  const audioUrl = resolveApiAssetUrl(source.audioUrl ?? source.audio_url ?? source.url);
  if (!audioUrl) return null;

  return {
    id: Number(source.id ?? 0),
    testId: Number(source.testId ?? source.test_id ?? 0),
    partGroupId: nullableNumber(source.partGroupId ?? source.part_group_id),
    title: stringValue(source.title ?? source.name, 'Listening tape'),
    audioUrl,
    durationSeconds: optionalNumber(source.durationSeconds ?? source.duration_seconds ?? source.duration),
    transcriptText: stringValue(source.transcriptText ?? source.transcript_text ?? source.transcript),
  };
}

function mapWritingReview(source: Record<string, any>): WritingRecordDetailView {
  const attachments = mapWritingReviewAttachments(source.attachments);
  const questionImages = mapWritingReviewImages(source);
  const previewAssets = mapWritingPreviewAssets(source.previewAssets ?? source.preview_assets);
  const answerText = stringValue(source.extractedText ?? source.extracted_text ?? source.answerText ?? source.answer_text ?? source.textContent ?? source.text_content ?? source.answerPreview);
  return {
    questionTitle: stringValue(source.questionTitle ?? source.title, 'Writing answer'),
    questionDescription: stringValue(source.questionDescription ?? source.description),
    questionImages,
    previewAssets: previewAssets.length ? previewAssets : [
      ...questionImages.map((image) => ({
        sourceType: 'QUESTION_IMAGE',
        fileType: 'IMAGE' as const,
        fileName: `Question image ${image.sortOrder}`,
        fileUrl: image.url,
        objectKey: image.objectKey,
        sortOrder: image.sortOrder,
        label: `Question image ${image.sortOrder}`,
        contentType: 'image/*',
      })),
      ...attachments.filter((attachment) => attachment.fileUrl).map((attachment, index) => ({
        sourceType: 'ANSWER_ATTACHMENT',
        fileType: attachment.fileType,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl as string,
        objectKey: attachment.fileUrl as string,
        sortOrder: index + 1,
        label: attachment.fileName,
        contentType: attachment.contentType,
      })),
    ],
    taskType: stringValue(source.taskType, 'TASK'),
    chartType: nullableString(source.chartType ?? source.chart_type),
    inputType: stringValue(source.inputType, 'TEXT'),
    answerText,
    answerSource: stringValue(source.answerSource),
    aiScore: nullableNumber(source.aiScore ?? source.score),
    aiFeedback: stringValue(source.aiFeedback ?? source.feedback, 'AI feedback is still pending for this writing answer.'),
    aiStatus: stringValue(source.aiStatus, 'PENDING'),
    attachments,
    attachmentNames: attachments.map((attachment) => attachment.fileName),
  };
}

function mapWritingReviewAttachments(value: unknown): WritingRecordAttachmentView[] {
  return normalizeUnknownArray(value).map((attachment, index) => {
    const source = asRecord(attachment);
    const fileName = stringValue(source.fileName ?? source.file_name ?? source.name, `Attachment ${index + 1}`);
    const contentType = stringValue(source.contentType ?? source.content_type);
    const fileUrl = resolveApiAssetUrl(source.fileUrl ?? source.file_url ?? source.url);
    return {
      fileName,
      fileUrl,
      contentType,
      fileType: resolveWritingFileType(source.fileType ?? source.file_type, contentType, fileName, fileUrl),
      size: nullableNumber(source.size),
    };
  });
}

function mapWritingPreviewAssets(value: unknown): WritingRecordPreviewAssetView[] {
  return normalizeUnknownArray(value).map((asset, index) => {
    const source = asRecord(asset);
    const fileUrl = resolveApiAssetUrl(source.fileUrl ?? source.file_url ?? source.url);
    if (!fileUrl) return null;

    const fileName = stringValue(source.fileName ?? source.file_name ?? source.name ?? source.label, `Preview ${index + 1}`);
    const contentType = stringValue(source.contentType ?? source.content_type);
    return {
      sourceType: stringValue(source.sourceType ?? source.source_type, 'ANSWER_ATTACHMENT').trim().toUpperCase(),
      fileType: resolveWritingFileType(source.fileType ?? source.file_type, contentType, fileName, fileUrl),
      fileName,
      fileUrl,
      objectKey: stringValue(source.objectKey ?? source.object_key ?? source.id ?? fileUrl, fileUrl),
      sortOrder: Number(source.sortOrder ?? source.sort_order ?? index + 1),
      label: stringValue(source.label, fileName),
      contentType,
    };
  }).filter((asset): asset is WritingRecordPreviewAssetView => Boolean(asset));
}

function mapWritingReviewImages(source: Record<string, any>): WritingRecordImageView[] {
  const images = normalizeUnknownArray(source.questionImages ?? source.question_images ?? source.images)
    .map((image, index) => {
      const item = asRecord(image);
      const url = resolveApiAssetUrl(item.fileUrl ?? item.file_url ?? item.url ?? item.imageUrl ?? item.image_url);
      if (!url) return null;

      return {
        url,
        objectKey: stringValue(item.objectKey ?? item.object_key ?? item.id ?? url, `image-${index + 1}`),
        sortOrder: Number(item.sortOrder ?? item.sort_order ?? index + 1),
      };
    })
    .filter((image): image is WritingRecordImageView => Boolean(image));
  const fallbackUrl = resolveApiAssetUrl(source.questionImageUrl ?? source.question_image_url ?? source.imageUrl ?? source.image_url);
  if (!images.length && fallbackUrl) {
    images.push({
      url: fallbackUrl,
      objectKey: stringValue(source.questionImageObjectKey ?? source.question_image_object_key ?? fallbackUrl, fallbackUrl),
      sortOrder: 1,
    });
  }

  return images;
}

function resolveWritingFileType(value: unknown, contentType: string, fileName: string, fileUrl: string | null): 'IMAGE' | 'PDF' | 'FILE' {
  const explicitType = stringValue(value).trim().toUpperCase();
  if (explicitType === 'IMAGE' || explicitType === 'PDF') return explicitType;

  const candidate = `${contentType} ${fileName} ${fileUrl ?? ''}`.toLowerCase();
  if (candidate.includes('application/pdf') || candidate.endsWith('.pdf') || candidate.includes('.pdf?')) return 'PDF';
  if (candidate.includes('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(candidate)) return 'IMAGE';
  return 'FILE';
}

function mapSpeakingReview(source: Record<string, any>): SpeakingRecordDetailView {
  return {
    overallScore: nullableNumber(source.overallScore),
    feedback: stringValue(source.feedback, 'Speaking feedback is not available yet.'),
    conversations: normalizeUnknownArray(source.conversations).map((conversation, index) => ({
      recordId: Number(conversation.recordId ?? conversation.record_id ?? index + 1),
      part: stringValue(conversation.part, `Part ${index + 1}`),
      questionText: stringValue(conversation.questionText ?? conversation.question_text),
      cueCard: stringValue(conversation.cueCard ?? conversation.cue_card),
      audioUrl: stringValue(conversation.audioUrl ?? conversation.audio_url),
      transcript: stringValue(conversation.transcript),
      overallScore: nullableNumber(conversation.overallScore),
      fluencyAndCoherence: nullableNumber(conversation.fluencyAndCoherence),
      lexicalResource: nullableNumber(conversation.lexicalResource),
      grammaticalRangeAndAccuracy: nullableNumber(conversation.grammaticalRangeAndAccuracy),
      pronunciation: nullableNumber(conversation.pronunciation),
      feedback: stringValue(conversation.feedback),
      relevanceComment: stringValue(conversation.relevanceComment),
      qualityComment: stringValue(conversation.qualityComment),
    })),
  };
}

function normalizeExamPartSources(source: Record<string, any>, passages: any[], moduleType: ModuleType): any[] {
  const parts = normalizeUnknownArray(source.parts ?? source.partGroups ?? source.part_groups);
  if (moduleType === 'READING' && passages.length) return dedupeExamParts(passages);
  if (moduleType === 'READING' && parts.length) return parts;

  const flattenedGroups = parts.flatMap((part, partIndex) => {
    const groups = normalizeUnknownArray(part.groups);
    if (!groups.length) return [];

    return groups.map((group, groupIndex) => ({
      ...group,
      partNumber: group.partNumber ?? group.part_number ?? part.partNumber ?? part.part_number ?? partIndex + 1,
      title: group.title ?? part.title,
      audios: normalizeUnknownArray(group.audios),
      sourceIndex: groupIndex,
    }));
  });

  if (flattenedGroups.length) return flattenedGroups;
  if (parts.length) return parts;
  return passages;
}

function collectNestedExamPassages(source: Record<string, any>): any[] {
  return normalizeUnknownArray(source.parts).flatMap((part, partIndex) => {
    const partSource = asRecord(part);
    const parentPartNumber = partSource.partNumber ?? partSource.part_number ?? partSource.part ?? partIndex + 1;

    return normalizeUnknownArray(partSource.groups).flatMap((group) => {
      const groupSource = asRecord(group);
      const parentPartGroupId = groupSource.partGroupId ?? groupSource.part_group_id ?? groupSource.groupId ?? groupSource.group_id ?? groupSource.id;

      return normalizeUnknownArray(groupSource.passages).map((passage) => ({
        ...asRecord(passage),
        partNumber: asRecord(passage).partNumber ?? asRecord(passage).part_number ?? parentPartNumber,
        partGroupId: asRecord(passage).partGroupId ?? asRecord(passage).part_group_id ?? parentPartGroupId,
      }));
    });
  });
}

function collectNestedExamQuestions(source: Record<string, any>): any[] {
  return normalizeUnknownArray(source.parts).flatMap((part, partIndex) => {
    const partSource = asRecord(part);
    const parentPartNumber = partSource.partNumber ?? partSource.part_number ?? partSource.part ?? partIndex + 1;
    const withPartContext = (question: unknown) => ({
      ...asRecord(question),
      partNumber: asRecord(question).partNumber ?? asRecord(question).part_number ?? parentPartNumber,
    });

    return [
      ...normalizeUnknownArray(partSource.questions).map(withPartContext),
      ...normalizeUnknownArray(partSource.groups).flatMap((group) => {
        const groupSource = asRecord(group);
        const parentPartGroupId = groupSource.partGroupId ?? groupSource.part_group_id ?? groupSource.groupId ?? groupSource.group_id ?? groupSource.id;
        const groupQuestions = normalizeUnknownArray(groupSource.questions);
        const shouldInheritGroupRange = groupQuestions.length <= 1;
        const withGroupContext = (question: unknown) => {
          const questionSource = asRecord(question);

          return {
            ...withPartContext(question),
            partGroupId: questionSource.partGroupId ?? questionSource.part_group_id ?? parentPartGroupId,
            questionType: questionSource.questionType ?? questionSource.question_type ?? groupSource.questionType ?? groupSource.question_type,
            optionsJson: questionSource.optionsJson ?? questionSource.options_json ?? groupSource.optionsJson ?? groupSource.options_json,
            tableRows: questionSource.tableRows ?? questionSource.table_rows ?? groupSource.tableRows ?? groupSource.table_rows,
            tableRowsJson: questionSource.tableRowsJson ?? questionSource.table_rows_json ?? groupSource.tableRowsJson ?? groupSource.table_rows_json,
            template: questionSource.template ?? questionSource.questionTemplate ?? questionSource.question_template ?? groupSource.template ?? groupSource.questionTemplate ?? groupSource.question_template,
            questionNoEnd: questionSource.questionNoEnd ?? questionSource.question_no_end ?? (shouldInheritGroupRange ? groupSource.questionNoEnd ?? groupSource.question_no_end : undefined),
            groupGuideText: questionSource.groupGuideText ?? questionSource.group_guide_text ?? questionSource.instructionText ?? questionSource.instruction_text ?? questionSource.instruction ?? groupSource.groupGuideText ?? groupSource.group_guide_text ?? groupSource.instructionText ?? groupSource.instruction_text ?? groupSource.instruction,
            groupRequirementText: questionSource.groupRequirementText ?? questionSource.group_requirement_text ?? groupSource.groupRequirementText ?? groupSource.group_requirement_text ?? groupSource.prompt,
          };
        };

        return [
          ...groupQuestions.map(withGroupContext),
          ...normalizeUnknownArray(groupSource.passages).flatMap((passage) => {
            const passageSource = asRecord(passage);
            const passagePartNumber = passageSource.partNumber ?? passageSource.part_number ?? passageSource.part ?? passageSource.passageNo ?? passageSource.passage_no ?? parentPartNumber;
            const passagePartGroupId = passageSource.partGroupId ?? passageSource.part_group_id ?? parentPartGroupId;

            return normalizeUnknownArray(passageSource.questions).map((question) => ({
              ...withGroupContext(question),
              partNumber: asRecord(question).partNumber ?? asRecord(question).part_number ?? passagePartNumber,
              partGroupId: asRecord(question).partGroupId ?? asRecord(question).part_group_id ?? passagePartGroupId,
            }));
          }),
        ];
      }),
    ];
  });
}

function dedupeExamParts(parts: any[]): any[] {
  const seen = new Set<string>();

  return parts.filter((part, index) => {
    const source = asRecord(part);
    const key = String(source.partNumber ?? source.part_number ?? source.part ?? source.passageNo ?? source.passage_no ?? index + 1);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectNestedExamAudios(source: Record<string, any>): any[] {
  return normalizeUnknownArray(source.parts).flatMap((part) => (
    [
      ...normalizeUnknownArray(part.audios),
      ...normalizeUnknownArray(part.groups).flatMap((group) => normalizeUnknownArray(group.audios)),
    ]
  ));
}

function findPassageForPart(passages: any[], part: any, index: number) {
  const partGroupId = part.partGroupId ?? part.part_group_id ?? part.groupId ?? part.group_id ?? part.id;
  const partNumber = part.partNumber ?? part.part ?? part.passageNo ?? part.passage_no;

  return passages.find((passage) => {
    const passageGroupId = passage.partGroupId ?? passage.part_group_id ?? passage.groupId ?? passage.group_id;
    return partGroupId !== undefined && passageGroupId !== undefined && String(partGroupId) === String(passageGroupId);
  }) ?? passages.find((passage) => {
    const passageNumber = passage.partNumber ?? passage.part_number ?? passage.part ?? passage.passageNo ?? passage.passage_no;
    return partNumber !== undefined && passageNumber !== undefined && String(partNumber) === String(passageNumber);
  }) ?? passages[index];
}

function formatScore(moduleType: ModuleType, score: number) {
  return moduleType === 'READING' || moduleType === 'LISTENING' ? `${Math.round(score)}/40` : score.toFixed(1);
}

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function normalizeUnknownArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  const source = asRecord(value);
  if (Array.isArray(source.list)) return source.list;
  if (Array.isArray(source.data)) return source.data;
  return [];
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function optionalString(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function booleanValue(value: unknown, fallback: boolean) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return !['0', 'false', 'FALSE', 'no', 'NO'].includes(value.trim());
  return Boolean(value);
}

function stringValue(value: unknown, fallback = '') {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
}

function resolveQuestionNoEnd(item: Record<string, any>, metadata: Record<string, any>, questionNumber: number, questionType: string) {
  const explicitEnd = optionalNumber(item.questionNoEnd ?? item.question_no_end ?? metadata.questionNoEnd ?? metadata.question_no_end);
  if (explicitEnd !== undefined) return explicitEnd;

  const answerCount = getCorrectAnswerValues(item, metadata).length;
  if (isMultipleScoredMultipleChoice(item, metadata, questionType) && answerCount > 1) {
    return questionNumber + answerCount - 1;
  }

  return undefined;
}

function resolveAnswerMode(item: Record<string, any>, metadata: Record<string, any>, questionType: string, questionNumber: number, questionNoEnd?: number) {
  const explicitMode = normalizeAnswerMode(item.answerMode ?? item.answer_mode ?? metadata.answerMode ?? metadata.answer_mode ?? metadata.selectionMode ?? metadata.selection_mode);
  if (explicitMode) return explicitMode;

  const normalizedType = questionType.trim().toUpperCase();
  if (normalizedType === 'MULTIPLE_CHOICE_MULTI') return 'MULTIPLE';
  if (isMultipleChoiceType(questionType) && questionNoEnd !== undefined && questionNoEnd > questionNumber) return 'MULTIPLE';
  if (isMultipleChoiceType(questionType) && getCorrectAnswerValues(item, metadata).length > 1) return 'MULTIPLE';
  if (isMultipleChoiceType(questionType)) return 'SINGLE';
  return 'TEXT';
}

function resolveQuestionScore(item: Record<string, any>, metadata: Record<string, any>, questionType: string, questionNumber: number, questionNoEnd?: number) {
  const explicitScore = nullableNumber(item.score);
  if (isMultipleScoredMultipleChoice(item, metadata, questionType) && questionNoEnd !== undefined && questionNoEnd > questionNumber) {
    return Math.max(explicitScore ?? 1, questionNoEnd - questionNumber + 1);
  }

  return explicitScore;
}

function normalizeAnswerMode(value: unknown) {
  const normalized = stringValue(value).trim().toUpperCase();
  if (['MULTIPLE', 'MULTI', 'CHECKBOX', 'CHECKBOXES'].includes(normalized)) return 'MULTIPLE';
  if (['SINGLE', 'RADIO'].includes(normalized)) return 'SINGLE';
  if (['TEXT', 'INPUT'].includes(normalized)) return 'TEXT';
  return '';
}

function isMultipleChoiceType(questionType: string) {
  return questionType.trim().toUpperCase().includes('MULTIPLE_CHOICE');
}

function isMultipleScoredMultipleChoice(item: Record<string, any>, metadata: Record<string, any>, questionType: string) {
  const normalizedType = questionType.trim().toUpperCase();
  const selectionMode = stringValue(item.selectionMode ?? item.selection_mode ?? metadata.selectionMode ?? metadata.selection_mode).trim().toLowerCase();
  return normalizedType === 'MULTIPLE_CHOICE_MULTI' || selectionMode === 'multiple' || selectionMode === 'multi';
}

function getCorrectAnswerValues(item: Record<string, any>, metadata: Record<string, any>) {
  const acceptedAnswers = parseJsonArray(
    item.acceptedAnswersJson
    ?? item.accepted_answers_json
    ?? metadata.acceptedAnswers
    ?? metadata.accepted_answers
    ?? metadata.correctAnswers
    ?? metadata.correct_answers,
  );
  if (acceptedAnswers.length) return acceptedAnswers.map((answer) => stringValue(answer).trim()).filter(Boolean);

  const correctAnswer = stringValue(item.correctAnswer ?? item.correct_answer ?? metadata.correctAnswer ?? metadata.correct_answer);
  if (!correctAnswer) return [];
  return correctAnswer.split(/[,;|]/).map((answer) => answer.trim()).filter(Boolean);
}

function mapQuestionOptions(value: unknown): Array<{ label: string; text: string }> {
  return parseQuestionOptions(value).map((option, index) => {
    const source = asRecord(option);
    if (!Object.keys(source).length && typeof option !== 'object') {
      const parsed = splitOptionLabel(String(option), String.fromCharCode(65 + index));
      return { label: parsed.label, text: parsed.text };
    }

    return {
      label: stringValue(source.label, String.fromCharCode(65 + index)),
      text: stringValue(source.text ?? source.content ?? source.value),
    };
  }).filter((option) => option.label || option.text);
}

function mapQuestionImages(value: unknown, fallback: unknown): string[] {
  const images = normalizeUnknownArray(value).map((image) => {
    const source = asRecord(image);
    return resolveApiAssetUrl(source.fileUrl ?? source.file_url ?? source.url ?? source.imageUrl ?? source.image_url);
  }).filter((url): url is string => Boolean(url));
  const fallbackUrl = resolveApiAssetUrl(fallback);
  return images.length ? images : fallbackUrl ? [fallbackUrl] : [];
}

function mapQuestionBlanks(value: unknown, questionNumber: number, questionId: number) {
  const blanks = normalizeUnknownArray(value).map((blank, index) => {
    const source = asRecord(blank);
    return {
      no: Number(source.no ?? source.questionNo ?? source.question_no ?? index + 1),
      questionId: Number(source.questionId ?? source.question_id ?? questionId) || questionId,
      questionNumber: Number(source.questionNumber ?? source.questionNo ?? source.question_no ?? questionNumber) || questionNumber,
    };
  });

  return blanks.length ? blanks : [{ no: questionNumber, questionId, questionNumber }];
}

function mapStringTable(value: unknown): string[][] | undefined {
  const source = asRecord(value);
  const rawRows = Object.keys(source).length
    ? source.rows ?? source.tableRows ?? source.table_rows ?? value
    : value;
  const rows = (typeof rawRows === 'string' ? parseJsonArray(rawRows) : normalizeUnknownArray(rawRows))
    .map((row) => normalizeUnknownArray(row).map((cell) => String(cell ?? '')));
  return rows.length ? rows : undefined;
}

function mapStringList(value: unknown): string[] {
  return parseJsonArray(value).map((item) => {
    const source = asRecord(item);
    if (Object.keys(source).length) {
      const label = source.label ? `${source.label}. ` : '';
      return `${label}${stringValue(source.text ?? source.heading ?? source.value)}`.trim();
    }
    return String(item);
  }).filter(Boolean);
}

function mapQuestionPairs(value: unknown): Array<{ left: string; answer?: string }> {
  return parseJsonArray(value).map((pair) => {
    const source = asRecord(pair);
    return {
      left: stringValue(source.left ?? source.prompt ?? source.text),
      answer: optionalString(source.answer),
    };
  }).filter((pair) => pair.left);
}

function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value: unknown): Record<string, any> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return {};
  }
}

function parseQuestionOptions(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    const source = asRecord(parsed);
    return normalizeUnknownArray(source.options ?? source.choices);
  } catch {
    return [];
  }
}

function splitOptionLabel(value: string, fallbackLabel: string) {
  const match = value.match(/^([A-Za-z0-9]+)[.)]\s*(.*)$/);
  return match ? { label: match[1], text: match[2] } : { label: fallbackLabel, text: value };
}
