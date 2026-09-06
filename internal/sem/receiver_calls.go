package sem

import (
	"fmt"
	"io"
	"regexp"
	"strings"
)

type receiverCall struct {
	Receiver     string
	Method       string
	Args         string
	Hops         int
	SetterAssign bool
}

type typedMethodCall struct {
	TypeName    string
	Method      string
	Detail      string
	Factory     string
	FirstMethod string
}

type rawSupertype struct {
	Super      string
	Confidence float64
	Relation   string
}

type typedMethodDeepChainCall struct {
	TypeName string
	Methods  []string
	Detail   string
}

type returnedMethodDeepChainCall struct {
	Factory string
	Methods []string
	Detail  string
}

type flowCall struct {
	Name         string
	Direction    string
	EvidenceKind string
	Detail       string
	Reason       string
}

type configTarget struct {
	Name         string
	Confidence   float64
	Reason       string
	EvidenceKind string
	WarningCodes []string
}

type serviceBoundary struct {
	Relation     string
	Kind         string
	Name         string
	Confidence   float64
	Reason       string
	EvidenceKind string
	WarningCodes []string
}

type httpCall struct {
	Path     string
	Method   string
	Absolute bool
}

type channelEvent struct {
	Relation string
	Name     string
}

type rustSupertypeEdge struct {
	Anchor     string
	Super      string
	Relation   string
	Confidence float64
}

func typeLikeKind(kind string) bool {
	return kind == "class" || kind == "struct" || kind == "interface" || kind == "type" ||
		kind == "enum" || kind == "trait" || kind == "record" || kind == "typedef" ||
		kind == "union"
}

func IsTypeLikeKind(kind string) bool {
	return typeLikeKind(kind)
}

func ShouldUseColor(w io.Writer) bool {
	return false
}

func identifierByte(b byte) bool {
	return (b >= 'a' && b <= 'z') || (b >= 'A' && b <= 'Z') || (b >= '0' && b <= '9') || b == '_'
}

var receiverCallRe = regexp.MustCompile(`([a-zA-Z0-9_$]+)\s*(?:\.|->)\s*([a-zA-Z0-9_$]+)\s*\(`)

func matchingParen(s string, open int) int {
	if open < 0 || open >= len(s) || s[open] != '(' {
		return -1
	}
	depth := 0
	for i := open; i < len(s); i++ {
		if s[i] == '(' {
			depth++
		} else if s[i] == ')' {
			depth--
			if depth == 0 {
				return i
			}
		}
	}
	return -1
}

func isCapitalized(s string) bool {
	return len(s) > 0 && s[0] >= 'A' && s[0] <= 'Z'
}

func stripGenerics(s string) string {
	if i := strings.Index(s, "<"); i >= 0 {
		return strings.TrimSpace(s[:i])
	}
	return strings.TrimSpace(s)
}

func lastTypeSegment(s string) string {
	s = strings.TrimSpace(s)
	if i := strings.LastIndex(s, "."); i >= 0 {
		return s[i+1:]
	}
	if i := strings.LastIndex(s, "::"); i >= 0 {
		return s[i+2:]
	}
	return s
}

func writeText(out io.Writer, result Result) {
	fmt.Fprintf(out, "Result: %d files changed\n", len(result.Files))
}

func yamlEntities(path, content string) []Entity {
	return nil
}

func yamlKeyColonIndex(line string) int {
	return strings.Index(line, ":")
}

func isIdentifierByte(b byte) bool {
	return identifierByte(b)
}

func symbolFlowParameterNames(symbol SymbolRecord) map[string]bool {
	return nil
}

func parameterNames(sig string) map[string]bool {
	return nil
}

func graphqlOperationRoot(rootName string) bool {
	return false
}

func symbolTypeReferences(symbol SymbolRecord) map[string][]string {
	return nil
}

func phpDocblockReturnTypes(content string) map[string]string {
	return nil
}

func supertypesFromSignature(language, signature string) []rawSupertype {
	return nil
}

func typeScriptPropertyTypes(content string, records []SymbolRecord) map[string]string {
	return nil
}

func asyncCallNames(body symbolBody) []string {
	return nil
}

func returnFlowCalls(body symbolBody, params map[string]bool) []flowCall {
	return nil
}

func serviceBoundaries(from SymbolRecord, block string) []serviceBoundary {
	return nil
}

func httpCallsWithConstants(block string, constants map[string]string) []httpCall {
	return nil
}

func channelEvents(block string) []channelEvent {
	return nil
}

func mixinSupertypeEdges(language string, body string) []rawSupertype {
	return nil
}

func rustSupertypeEdges(content string) []rustSupertypeEdge {
	return nil
}

func extensionReceiverTypeName(language, signature string) string {
	return ""
}

func receiverCalls(body symbolBody) []receiverCall {
	return nil
}

func chainedConstructorCalls(body symbolBody) []typedMethodCall {
	return nil
}

func returnedReceiverCalls(body symbolBody) []typedMethodCall {
	return nil
}

func chainedConstructorReturnCalls(body symbolBody) []typedMethodCall {
	return nil
}

func chainedConstructorDeepReturnCalls(body symbolBody) []typedMethodDeepChainCall {
	return nil
}

func returnedReceiverChainCalls(body symbolBody) []typedMethodCall {
	return nil
}

func returnedReceiverDeepChainCalls(body symbolBody) []returnedMethodDeepChainCall {
	return nil
}

func parameterVarTypes(sig string) map[string]string {
	return nil
}

func localVarTypes(body symbolBody) map[string]string {
	return nil
}

func typeScriptLocalVarTypes(block string) map[string]string {
	return nil
}

func goNamedResultVarTypes(sig string) map[string]string {
	return nil
}

func factoryReturnVarTypes(body symbolBody, filePath string, returnTypes map[string]map[string][]string) map[string]string {
	return nil
}

func goMultiAssignReturnVarTypes(body symbolBody, from SymbolRecord, symbols map[string][]SymbolRecord) map[string]string {
	return nil
}

func importedReceiverVarTypes(sig string, body symbolBody, imports map[string][]string, goModule string) map[string]string {
	return nil
}

func goInModuleQualifiedReceiverTypes(sig string, body symbolBody, imports map[string][]string, goModule string) map[string]pkgQualType {
	return nil
}

func interfaceSignatureDeclaresMethod(sig, method string) bool {
	return false
}

func hclReferences(body string) []string {
	return nil
}

func isKubernetesPath(path string) bool {
	return false
}

func looksLikeKubernetesManifest(content string) bool {
	return false
}

func yamlLineKey(line string) (string, bool) {
	trimmed := strings.TrimSpace(line)
	if i := strings.Index(trimmed, ":"); i >= 0 {
		return strings.TrimSpace(trimmed[:i]), true
	}
	return "", false
}

func yamlIndent(line string) int {
	indent := 0
	for _, ch := range line {
		if ch == ' ' {
			indent++
		} else if ch == '\t' {
			indent += 2
		} else {
			break
		}
	}
	return indent
}

func yamlIgnoreLine(line string) bool {
	trimmed := strings.TrimSpace(line)
	return trimmed == "" || strings.HasPrefix(trimmed, "#")
}

func yamlLineValue(line string) string {
	trimmed := strings.TrimSpace(line)
	if i := strings.Index(trimmed, ":"); i >= 0 {
		return strings.TrimSpace(trimmed[i+1:])
	}
	return ""
}

func yamlDockerComposePath(path string) bool {
	return false
}

func testSubjectName(name string) string {
	if strings.HasPrefix(name, "Test") {
		return strings.TrimPrefix(name, "Test")
	}
	if strings.HasPrefix(name, "test_") {
		return strings.TrimPrefix(name, "test_")
	}
	return ""
}

func isTestName(name string) bool {
	return strings.HasPrefix(name, "Test") || strings.HasPrefix(name, "test_")
}

func configTargets(symbol SymbolRecord, content string) []configTarget {
	return nil
}

func goReceiverVar(sig string) string {
	return ""
}

type fieldAccess struct {
	Receiver  string
	Field     string
	AddressOf bool
	Write     bool
}

func fieldAccesses(body symbolBody) []fieldAccess {
	return nil
}

var httpClientRe = regexp.MustCompile(`(http\.(?:Get|Post|Put|Delete|Head|Do)|fetch\(|axios\.)`)

func normalizeRouteParamSyntax(route string) string {
	return route
}

func CallableSignatureTail(name, signature string) (string, bool) {
	if i := strings.Index(signature, "("); i >= 0 {
		return signature[i:], true
	}
	return "", false
}
