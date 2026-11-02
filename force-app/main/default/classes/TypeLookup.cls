// Finds a class by name from inside the package. Type.forName(name) looks the name up in the namespace of the calling code, so the
// package could not see a class that a customer wrote in the subscriber org (no namespace): the Apex class of a template and the
// handler class of the chained generation were silently skipped in an installed package. The namespace of the class is given here.
public with sharing class TypeLookup {
    public static Type forName(String className, String namespacePrefix) {
        if (String.isBlank(className)) { return null; }
        String name = className.trim();
        String prefix = namespacePrefix;
        if (name.contains('.')) { // "Namespace.ClassName"
            prefix = name.substringBefore('.');
            name = name.substringAfter('.');
        }
        Type found = Type.forName(String.isBlank(prefix) ? '' : prefix, name);
        return found != null ? found : Type.forName(name);
    }
}
