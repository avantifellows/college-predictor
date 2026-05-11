export function classifyCollege(studentRank,closingRank){
    if(!studentRank ||
    !closingRank ||
    isNaN(studentRank) ||
    isNaN(closingRank) ||
    closingRank <= 0){
        return "Unknown";
    }

    const ratio= studentRank/closingRank;
    if(ratio<=0.85) return "Safe";
    if(ratio<=1.05) return "Moderate";
    return "Dream";
}