{{/* Name helpers */}}
{{- define "todo-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "todo-app.fullname" -}}
{{- printf "%s" (include "todo-app.name" .) -}}
{{- end -}}
