package termsafe

import (
	"bytes"
	"fmt"
	"io"
	"unicode/utf8"
)

// Line sanitizes a string for terminal display by escaping ASCII controls and C1 controls.
func Line(s string) string {
	return string(Bytes([]byte(s)))
}

// EscapesLine reports whether sanitizing s alters any character.
func EscapesLine(s string) bool {
	return Line(s) != s
}

// Bytes sanitizes a byte slice for terminal display by escaping control characters.
func Bytes(src []byte) []byte {
	var buf bytes.Buffer
	buf.Grow(len(src))

	for i := 0; i < len(src); {
		b := src[i]

		// C0 controls (0x00-0x1F except tab if desirable, but \x1b, \n, \r are escaped)
		// Specifically escape ESC (\x1b), NUL, line breaks, etc.
		if b < 0x20 && b != '\t' {
			fmt.Fprintf(&buf, "\\x%02x", b)
			i++
			continue
		}

		if b == 0x7f { // DEL
			buf.WriteString("\\x7f")
			i++
			continue
		}

		// Two-byte C1 control in UTF-8: 0xC2 followed by 0x80..0x9F
		if b == 0xc2 && i+1 < len(src) && src[i+1] >= 0x80 && src[i+1] <= 0x9f {
			c1 := src[i+1]
			fmt.Fprintf(&buf, "\\x%02x", c1)
			i += 2
			continue
		}

		// Stray 8-bit C1 byte: 0x80..0x9F
		if b >= 0x80 && b <= 0x9f {
			fmt.Fprintf(&buf, "\\x%02x", b)
			i++
			continue
		}

		// Valid UTF-8 rune or normal byte
		r, size := utf8.DecodeRune(src[i:])
		if r == utf8.RuneError && size == 1 {
			// Stray byte
			if b >= 0x80 && b <= 0x9f {
				fmt.Fprintf(&buf, "\\x%02x", b)
			} else {
				buf.WriteByte(b)
			}
			i++
			continue
		}

		if r >= 0x80 && r <= 0x9f {
			fmt.Fprintf(&buf, "\\x%02x", r)
			i += size
			continue
		}

		buf.Write(src[i : i+size])
		i += size
	}

	return buf.Bytes()
}

type safeWriter struct {
	w io.Writer
}

func (sw *safeWriter) Write(p []byte) (n int, err error) {
	escaped := Bytes(p)
	_, err = sw.w.Write(escaped)
	return len(p), err
}

// NewWriter returns a writer that filters terminal-unsafe controls out of written bytes.
func NewWriter(w io.Writer) io.Writer {
	return &safeWriter{w: w}
}

type jsonSafeWriter struct {
	w io.Writer
}

// Write escapes C1 controls as \u00xx so that standard json decoders decode them losslessly,
// but no raw C1 bytes reach the output stream.
func (jw *jsonSafeWriter) Write(p []byte) (n int, err error) {
	var buf bytes.Buffer
	buf.Grow(len(p))

	for i := 0; i < len(p); {
		b := p[i]
		// Two-byte C1: 0xC2 followed by 0x80..0x9F
		if b == 0xc2 && i+1 < len(p) && p[i+1] >= 0x80 && p[i+1] <= 0x9f {
			c1 := p[i+1]
			fmt.Fprintf(&buf, "\\u00%02x", c1)
			i += 2
			continue
		}
		// Stray C1 byte
		if b >= 0x80 && b <= 0x9f {
			fmt.Fprintf(&buf, "\\u00%02x", b)
			i++
			continue
		}
		buf.WriteByte(b)
		i++
	}

	_, err = jw.w.Write(buf.Bytes())
	return len(p), err
}

func (jw *jsonSafeWriter) Close() error {
	return nil
}

// NewJSONWriter returns a writer that ensures C1 controls are escaped as \u00xx in JSON output.
func NewJSONWriter(w io.Writer) *jsonSafeWriter {
	return &jsonSafeWriter{w: w}
}
