import { InventoryForm } from '../types';
import { allOfficialStoreForms, allOfficialStoreItems } from '../data/storeFormsData';
import { sampleForms } from '../data/sampleData';

const FORMS_STORAGE_KEY = 'the_commissary_custom_forms_v2';
const DELETED_FORMS_KEY = 'the_commissary_deleted_form_ids_v1';

/**
 * Get all available inventory checksheets, merging preloaded OneDrive checksheets
 * with custom user-created, edited, and respecting deleted forms.
 */
export function getStoredForms(): InventoryForm[] {
  try {
    const deletedIds = getDeletedFormIds();
    const saved = localStorage.getItem(FORMS_STORAGE_KEY);
    
    // Base preloaded forms from OneDrive 2026 + sampleForms
    const baseMap = new Map<string, InventoryForm>();
    allOfficialStoreForms.forEach(f => {
      if (!deletedIds.has(f.id)) baseMap.set(f.id, f);
    });
    sampleForms.forEach(f => {
      if (!deletedIds.has(f.id)) baseMap.set(f.id, f);
    });

    if (saved) {
      const customForms: InventoryForm[] = JSON.parse(saved);
      customForms.forEach(f => {
        if (!deletedIds.has(f.id)) {
          baseMap.set(f.id, f); // Custom/edited forms overwrite base
        }
      });
    }

    return Array.from(baseMap.values());
  } catch (err) {
    console.error('Error reading forms from storage:', err);
    return [...allOfficialStoreForms, ...sampleForms];
  }
}

/**
 * Get set of deleted form IDs
 */
export function getDeletedFormIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_FORMS_KEY);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch {}
  return new Set();
}

/**
 * Add or update an inventory form
 */
export function saveFormToStorage(form: InventoryForm): InventoryForm[] {
  try {
    const currentForms = getStoredForms();
    const existingIndex = currentForms.findIndex(f => f.id === form.id);
    let updated: InventoryForm[];

    if (existingIndex >= 0) {
      updated = [...currentForms];
      updated[existingIndex] = form;
    } else {
      updated = [form, ...currentForms];
    }

    // Un-delete if it was previously marked deleted
    const deletedIds = getDeletedFormIds();
    if (deletedIds.has(form.id)) {
      deletedIds.delete(form.id);
      localStorage.setItem(DELETED_FORMS_KEY, JSON.stringify(Array.from(deletedIds)));
    }

    // Save custom modified forms
    localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Error saving form to storage:', err);
    return getStoredForms();
  }
}

/**
 * Delete a form permanently
 */
export function deleteFormFromStorage(formId: string): InventoryForm[] {
  try {
    // Record in deleted list
    const deletedIds = getDeletedFormIds();
    deletedIds.add(formId);
    localStorage.setItem(DELETED_FORMS_KEY, JSON.stringify(Array.from(deletedIds)));

    // Also remove from custom forms if present
    const currentForms = getStoredForms().filter(f => f.id !== formId);
    localStorage.setItem(FORMS_STORAGE_KEY, JSON.stringify(currentForms));
    return currentForms;
  } catch (err) {
    console.error('Error deleting form from storage:', err);
    return getStoredForms();
  }
}

/**
 * Duplicate a form to another store location
 */
export function duplicateFormInStorage(
  sourceForm: InventoryForm, 
  targetLocCode: string, 
  newTitle?: string
): { updatedForms: InventoryForm[]; newForm: InventoryForm } {
  const newId = `form-${targetLocCode.toLowerCase()}-${Date.now().toString(36)}`;
  const title = newTitle || `${targetLocCode} - ${sourceForm.title.replace(/^[A-Z]{2,4}\s*-\s*/i, '')} (Copy)`;
  
  const clonedForm: InventoryForm = {
    ...sourceForm,
    id: newId,
    title,
    locationCode: targetLocCode,
    active: true,
    sections: sourceForm.sections.map(s => ({
      name: s.name,
      itemIds: [...s.itemIds]
    }))
  };

  const updatedForms = saveFormToStorage(clonedForm);
  return { updatedForms, newForm: clonedForm };
}
