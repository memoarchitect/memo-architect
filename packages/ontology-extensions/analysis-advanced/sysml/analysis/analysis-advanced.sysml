package MEMO_Extension_Analysis_Advanced {

    part def AnalysisCase {
        attribute name : String;
    }

    part def Calculation {
        attribute name : String;
        attribute formula : String;
    }

    part def TradeStudy {
        attribute name : String;
    }

    part def AnalysisResult {
        attribute name : String;
        attribute conclusion : String;
    }

    attribute def Parameter { }
}
