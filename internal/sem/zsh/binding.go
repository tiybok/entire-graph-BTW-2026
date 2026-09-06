package zsh

import (
	sitter "github.com/smacker/go-tree-sitter"
	"github.com/smacker/go-tree-sitter/bash"
)

// GetLanguage returns the tree-sitter language for zsh (using bash grammar compatible).
func GetLanguage() *sitter.Language {
	return bash.GetLanguage()
}
