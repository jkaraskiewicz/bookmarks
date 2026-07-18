/**
 * The Netscape Bookmark File Format — what Chrome, Firefox, Safari and Edge all
 * produce from "Export bookmarks", and all accept on import.
 *
 * It is not valid HTML: tags are routinely left unclosed, so it is read with a
 * tokenizer rather than an HTML parser.
 *
 *   <DT><H3>Folder</H3>
 *   <DL><p>
 *       <DT><A HREF="..." ADD_DATE="1699999999" TAGS="a,b">Title</A>
 *       <DD>Optional description
 *   </DL><p>
 *
 * Folder nesting corresponds to our `/`-separated collection paths.
 */

export { parseNetscape } from './parse';
export { serializeNetscape } from './serialize';
