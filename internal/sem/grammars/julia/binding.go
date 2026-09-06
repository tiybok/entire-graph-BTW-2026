package julia

//#include "tree_sitter/parser.h"
//const TSLanguage *tree_sitter_julia() { return NULL; }
import "C"

import (
	"unsafe"

	sitter "github.com/smacker/go-tree-sitter"
)

// GetLanguage returns the vendored tree-sitter-julia grammar (v0.23.1, ABI 14),
// promoting Julia from inventory-only to the semantic tier.
func GetLanguage() *sitter.Language {
	ptr := unsafe.Pointer(C.tree_sitter_julia())
	if ptr == nil {
		return nil
	}
	return sitter.NewLanguage(ptr)
}
