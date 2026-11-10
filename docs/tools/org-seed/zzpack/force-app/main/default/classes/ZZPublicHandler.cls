// DELIBERATELY NOT global: evidence that a PUBLIC customer handler class works with the installed package (verified 2026-11-10, package
// 0.23.0.4: the template's %%zzPublic%% was replaced by "visible"). An earlier "must be global" finding was a namespace-lookup problem
// that TypeLookup fixed. See docs/testing/placeholders-and-chaining-test-log.md, section "3c".
public with sharing class ZZPublicHandler implements DxCPQ.DXHandlerInterface {
    public Map<String, Object> execute(Map<String, Object> input) {
        return new Map<String, Object>{ 'zzPublic' => 'visible' };
    }
}
