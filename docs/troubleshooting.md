# Troubleshooting

Common issues and solutions for the opencode-orca plugin.

## Installation Issues

**Plugin not found**: Verify `opencode.jsonc` includes `"@ex-machina/opencode-orca"` in the `plugin` array.

**orca.json invalid**: JSON syntax error. Common issues: trailing commas, missing quotes. Validate with `jq . .opencode/orca.json`.

**Permission denied**: Check file permissions: `chmod 755 .opencode && chmod 644 .opencode/orca.json`

## Configuration Issues

**Schema validation errors**: Zod provides detailed paths. Example:
```
Invalid .opencode/orca.json:
  - agents.researcher.temperature: Number must be less than or equal to 2
```
Each line shows `path: message`. Fix the value at the specified path.

**Unknown fields rejected**: Root config uses `strictObject`. Valid top-level keys are: `$schema`, `orca`, `planner`, `agents`, `settings`. Remove unrecognized fields.

**Trying to override orca/planner**: These agents have restricted configuration. Only `model`, `temperature`, `top_p`, `maxSteps`, and `color` can be changed. Use the dedicated `orca` and `planner` keys, not `agents`.

**Type mismatches**: Common errors include `"0.7"` instead of `0.7` (temperature), `"true"` instead of `true` (disable), and invalid enums like `"sub-agent"` instead of `"subagent"`.

## Runtime Issues

**Agent not responding**: Check for `disable: true` in config. Verify model exists and you have quota.

**Validation failures**: If responses fail format validation, increase `settings.validation.maxRetries` (default: 3, max: 10) or enable `wrapPlainText: true`.

**Agent returns wrong format**: Verify `accepts` array includes the input types (`'task'`, `'question'`) the agent should receive. Response types are derived automatically.

**Empty response**: Model returned empty completion, agent hit max steps, or tool loop consumed output.

## Plan Issues

**Plan stuck in drafting**: The planner may be waiting for clarification. Check for pending HITL questions.

**Plan not saving**: Verify `.opencode/plans/` directory exists and is writable.

**Can't find old plan**: Plans are stored as JSON files in `.opencode/plans/`. Use `orca_list_plans` to see available plans.

**Execution stuck**: If a step is stuck `in_progress`, the session may have crashed. Resume the plan - you'll get a HITL prompt to Retry, Replan, or Stop.

## HITL Issues

**HITL prompt not appearing**: Verify OpenCode TUI is in the foreground. HITL questions require user interaction.

**Wrong options in HITL**: The planner or plugin provides HITL content. If options seem wrong, the planner may need clearer instructions in its prompt.

**Can't type custom answer**: Check if `custom: false` on the question. Plugin-controlled questions (approval, deviation) have deterministic options - use the Context tab for freeform input.

## Error Codes

| Code              | Meaning                                            |
| ----------------- | -------------------------------------------------- |
| `VALIDATION_ERROR`  | Message format invalid - failed schema validation  |
| `UNKNOWN_AGENT`     | Agent ID not registered in configuration           |
| `SESSION_NOT_FOUND` | Requested session does not exist                   |
| `AGENT_ERROR`       | Agent execution failed (model error, tool failure) |
| `TIMEOUT`           | Request exceeded time limit                        |

## Debugging Tips

1. **Check version compatibility**: Requires `@opencode-ai/plugin` ^1.0.0
2. **Validate JSON first**: Use `jq . .opencode/orca.json` before checking schema
3. **Isolate with minimal config**: Start with empty `{}` and add fields incrementally
4. **Check model availability**: Verify model name and API quota in provider dashboard
5. **Check plan files**: Look at `.opencode/plans/*.json` to see plan state

## FAQ

**How do I reset to defaults?**
Delete `orca.json` and run `bunx @ex-machina/opencode-orca@latest install` to regenerate from template.

**Can I use multiple orchestrators?**
No. Orca is the primary orchestrator and routes all requests to the planner.

**How do I disable an agent?**
Set `disable: true` in the agent configuration:
```json
{ "agents": { "researcher": { "disable": true } } }
```

**How do I see my plans?**
Plans are stored in `.opencode/plans/`. Agents can also use `orca_list_plans` and `orca_describe_plan` to query them.

**How do I resume a plan?**
Use `orca_ask_planner` with the `plan_id` to continue where you left off.
