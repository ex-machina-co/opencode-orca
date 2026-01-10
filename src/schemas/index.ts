// Contract schemas for Orca agent communication

// Error codes
export { ErrorCode, ErrorCodeSchema } from './errors'
export type { ErrorCode as ErrorCodeType } from './errors'

// Common primitives
export {
  AgentIdSchema,
  BaseEnvelopeSchema,
  ResponseEnvelopeSchema,
  SessionIdSchema,
  TimestampSchema,
} from './common'
export type {
  AgentId,
  BaseEnvelope,
  ResponseEnvelope,
  SessionId,
  Timestamp,
} from './common'

// Field schemas (new canonical names)
export {
  AnnotationSchema,
  AnswerFieldsSchema,
  CheckpointFieldsSchema,
  FailureFieldsSchema,
  InterruptFieldsSchema,
  PlanContextSchema,
  PlanFieldsSchema,
  PlanStepSchema,
  QuestionFieldsSchema,
  SourceSchema,
  SuccessFieldsSchema,
  TaskFieldsSchema,
} from './payloads'
export type {
  Annotation,
  AnswerFields,
  CheckpointFields,
  FailureFields,
  InterruptFields,
  PlanContext,
  PlanFields,
  PlanStep,
  QuestionFields,
  Source,
  SuccessFields,
  TaskFields,
} from './payloads'

// Message schemas
export {
  AnswerMessageSchema,
  CheckpointMessageSchema,
  FailureMessageSchema,
  InterruptMessageSchema,
  MessageEnvelopeSchema,
  PlanMessageSchema,
  QuestionMessageSchema,
  SuccessMessageSchema,
  TaskMessageSchema,
} from './messages'

export type {
  AnswerMessage,
  CheckpointMessage,
  FailureMessage,
  InterruptMessage,
  MessageEnvelope,
  MessageType,
  PlanMessage,
  QuestionMessage,
  SuccessMessage,
  TaskMessage,
} from './messages'

// Field documentation utilities for generating prompts from schemas
export {
  extractFieldDocs,
  formatFieldDocsAsCodeList,
  formatFieldDocsAsMarkdownList,
} from './jsonschema'
export type { FieldDoc } from './jsonschema'
