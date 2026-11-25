# CALIBRATION AND UNCERTAINTY EVALUATION REPORT

## 1. The Calibration Imperative in Agricultural AI
A diagnostic vision system must know what it does not know. Prior models suffered from high overconfidence on misdiagnosed samples.
We implemented Post-Hoc Temperature Scaling and Predictive Entropy Scoring to guarantee that model confidence reflects true posterior probability.

## 2. Calibration Metrics Across Architectures
| Architecture | Uncalibrated ECE | Temperature-Scaled ECE | Brier Score | OOD AUROC | Rejection @ FPR 5% |
|---|---|---|---|---|---|
| MobileNetV3-Large | 0.148 | **0.082** | 0.067 | 0.881 | 82.8% |
| EfficientNetV2-B0 | 0.097 | **0.054** | 0.054 | 0.934 | 87.8% |
| EfficientNetV2-S | 0.050 | **0.028** | 0.043 | 0.978 | 91.9% |
| ConvNeXt-Tiny | 0.083 | **0.046** | 0.051 | 0.962 | 90.4% |
| DeiT-Small | 0.122 | **0.068** | 0.061 | 0.921 | 86.6% |

## 3. Post-Hoc Temperature Scaling Optimization
For the champion EfficientNetV2-S model, temperature scaling was optimized via Negative Log-Likelihood (NLL) minimization on the held-out validation set:
$$\hat{p}_i = \frac{\exp(z_i / T)}{\sum_j \exp(z_j / T)}$$
- **Optimal Temperature ($T^*)**: **1.28**
- **Validation NLL**: Decreased from 0.382 to **0.241**
- **ECE Reduction**: From 0.051 to **0.028** (45.1% improvement in calibration)

## 4. Entropy-Based Abstention & Out-Of-Distribution Rejection
When an incoming image does not match genuine crop foliage, or visual symptoms are too ambiguous to distinguish,
the model calculates the normalized Shannon entropy of the calibrated distribution:
$$H(p) = - \sum_{i=1}^K p_i \log_2 p_i$$
- **Entropy Threshold ($H_{thresh}$)**: 1.15 bits
- **Abstention Policy**: If $H(p) > H_{thresh}$ or $\max_i p_i < 0.70$, the application gracefully refrains from emitting a speculative diagnosis.
- **Field Farmer Safety**: Farmers receive an immediate explanatory alert requesting a closer, clearer photograph, preventing costly and harmful chemical misapplications.
