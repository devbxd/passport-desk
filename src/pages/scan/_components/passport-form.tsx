import { Fragment } from "react";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  PASSPORT_FIELDS,
  REQUIRED_FIELDS,
  calculateAge,
  type PassportFieldKey,
  type PassportRecordFields,
  type PassportValidationIssue,
} from "@/lib/passport.ts";

type PassportFormProps = {
  value: PassportRecordFields;
  onChange: (next: PassportRecordFields) => void;
  validationIssues?: PassportValidationIssue[];
};

export default function PassportForm({
  value,
  onChange,
  validationIssues = [],
}: PassportFormProps) {
  const setField = (key: PassportFieldKey, fieldValue: string) => {
    onChange({ ...value, [key]: fieldValue });
  };
  const age = calculateAge(value.dateOfBirth);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {PASSPORT_FIELDS.map((field) => {
          const fieldIssues = validationIssues.filter(
            (issue) => issue.key === field.key,
          );
          const hasError = fieldIssues.some((issue) => issue.severity === "error");
          const issueId = `${field.key}-validation`;

          return (
            <Fragment key={field.key}>
            <div className="space-y-2">
              <Label htmlFor={field.key}>
                {field.label}
                {REQUIRED_FIELDS.includes(field.key) && (
                  <span className="text-destructive">*</span>
                )}
              </Label>
              {field.type === "sex" ? (
                <Select
                  value={value.sex === "" ? "none" : value.sex}
                  onValueChange={(next) =>
                    setField("sex", next === "none" ? "" : next)
                  }
                >
                  <SelectTrigger
                    id={field.key}
                    className="w-full"
                    aria-invalid={hasError}
                    aria-describedby={fieldIssues.length > 0 ? issueId : undefined}
                  >
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">M — Male</SelectItem>
                    <SelectItem value="F">F — Female</SelectItem>
                    <SelectItem value="X">X — Unspecified</SelectItem>
                    <SelectItem value="none">Not stated</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id={field.key}
                  type={field.type === "date" ? "date" : "text"}
                  value={value[field.key]}
                  aria-invalid={hasError}
                  aria-describedby={fieldIssues.length > 0 ? issueId : undefined}
                  placeholder={field.type === "date" ? undefined : field.label}
                  onChange={(event) => setField(field.key, event.target.value)}
                />
              )}
              {fieldIssues.length > 0 && (
                <div id={issueId} className="space-y-1">
                  {fieldIssues.map((issue) => (
                    <p
                      key={`${issue.severity}-${issue.message}`}
                      className={
                        issue.severity === "error"
                          ? "text-destructive text-xs"
                          : "text-muted-foreground text-xs"
                      }
                    >
                      {issue.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
            {field.key === "dateOfBirth" && (
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  readOnly
                  tabIndex={-1}
                  value={age === null ? "" : `${age} ${age === 1 ? "year" : "years"}`}
                  placeholder="Calculated from date of birth"
                  className="bg-muted/50"
                />
              </div>
            )}
            </Fragment>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="mrz">Machine readable zone</Label>
        <Textarea
          id="mrz"
          rows={2}
          spellCheck={false}
          className="font-mono text-xs"
          value={value.mrz}
          onChange={(event) => setField("mrz", event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={2}
          value={value.notes}
          placeholder="Anything worth flagging about this document"
          onChange={(event) => setField("notes", event.target.value)}
        />
      </div>
    </div>
  );
}
