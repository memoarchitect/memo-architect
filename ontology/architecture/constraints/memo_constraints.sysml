package memo {
    package architecture {
        package constraints {
            doc /* archLayer: constraints */

            constraint def MaxResponseTimeConstraint { attribute responseTimeMs : Real; attribute maxAllowedMs : Real; }
            constraint def LockoutIntervalConstraint { attribute elapsedMs : Real; attribute lockoutMs : Real; }
        }
    }
}
