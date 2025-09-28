import { supabase } from "@/lib/supabase"

export async function fetchNCERTMetadata() {
  const { data, error } = await supabase
    .from("ncert_learning_outcomes")
    .select("subject, grade, chapter_number, chapter_name,  outcome1, outcome2, outcome3, outcome4, outcome5")
  if (error) throw error
  return data
}