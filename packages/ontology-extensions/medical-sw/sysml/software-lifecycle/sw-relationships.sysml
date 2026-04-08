package MEMO_Extension_Medical_SW_Relationships {

    connection def GovernsActivity {
        end process : SoftwareLifecycleProcess [1];
        end activity : SoftwareLifecycleActivity [1];
    }

    connection def ProducesWorkProduct {
        end activity : SoftwareLifecycleActivity [1];
        end workProduct : SoftwareWorkProduct [1];
    }
}
