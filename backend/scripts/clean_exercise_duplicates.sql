BEGIN;

CREATE OR REPLACE FUNCTION normalize_text(text_input TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    TRIM(
      translate(
        text_input,
        'áàäâéèëêíìïîóòöôúùüûñÁÀÄÂÉÈËÊÍÌÏÎÓÒÖÔÚÙÜÛÑ',
        'aaaaeeeeiiiiooooouuuunaaaaeeeeiiiiooooouuuun'
      )
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TABLE IF EXISTS temp_exercise_normalized;
CREATE TEMP TABLE temp_exercise_normalized AS
SELECT 
  id,
  name,
  "categoryId",
  UPPER(TRIM(name)) as name_uppercase,
  normalize_text(name) as name_normalized
FROM "ExerciseMaster";

DROP TABLE IF EXISTS temp_exercises_to_keep;
CREATE TEMP TABLE temp_exercises_to_keep AS
SELECT DISTINCT ON (name_normalized)
  id as keep_id,
  name_normalized,
  name_uppercase as final_name,
  "categoryId"
FROM temp_exercise_normalized
ORDER BY name_normalized, id;

DROP TABLE IF EXISTS temp_name_mapping;
CREATE TEMP TABLE temp_name_mapping AS
SELECT 
  ten.name as old_name,
  tek.final_name as new_name,
  tek.keep_id,
  ten.id as old_id
FROM temp_exercise_normalized ten
JOIN temp_exercises_to_keep tek ON ten.name_normalized = tek.name_normalized;

UPDATE "ExerciseDetail" ed
SET name = tnm.new_name
FROM temp_name_mapping tnm
WHERE ed.name = tnm.old_name
  AND ed.name != tnm.new_name;

UPDATE "ExerciseMaster" em
SET name = tek.final_name
FROM temp_exercises_to_keep tek
WHERE em.id = tek.keep_id
  AND em.name != tek.final_name;

DELETE FROM "ExerciseMaster"
WHERE id NOT IN (SELECT keep_id FROM temp_exercises_to_keep);

DROP TABLE IF EXISTS temp_exercise_normalized;
DROP TABLE IF EXISTS temp_exercises_to_keep;
DROP TABLE IF EXISTS temp_name_mapping;

COMMIT;